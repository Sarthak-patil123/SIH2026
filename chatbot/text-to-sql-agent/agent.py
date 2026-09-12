"""
Text-to-SQL Agent — SIH 2026 Admin Chatbot
Adapted from: https://github.com/kevinbfrank/text-to-sql-agent

Runs in two modes:
  1. Flask API server (default):  python agent.py --serve
  2. CLI one-shot:                python agent.py "your question here"
"""

import os
import sys
import argparse
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langgraph.prebuilt import create_react_agent
try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None

from rich.console import Console
from rich.panel import Panel

# Load environment variables
load_dotenv()

console = Console()

# ---------------------------------------------------------------------------
# System prompt — with directly injected database schema for single-turn execution
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
You are a fast, secure AI assistant for the SSB (Sashastra Seema Bal) Admin panel.
You translate natural language questions into accurate PostgreSQL queries and display the answers in formatted markdown tables.

COMPLETE DATABASE SCHEMA (DO NOT query for tables or schema — it is fully provided here):

TABLE "User" (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    role VARCHAR, -- 'OFFICER' or 'ADMIN'
    "officerId" TEXT, -- Badge ID like 'SSB-OFC-001', 'SSB-ADM-001'
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP
);

TABLE "Case" (
    id TEXT PRIMARY KEY,
    title TEXT,
    "personName" TEXT, -- Name of the person undergoing screening
    status VARCHAR, -- 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED'
    "riskScore" DOUBLE PRECISION, -- 0 to 100
    "riskLevel" VARCHAR, -- 'LOW', 'MEDIUM', 'HIGH'
    "officerId" TEXT REFERENCES "User"(id), -- Officer who handled the case
    "reviewedById" TEXT REFERENCES "User"(id), -- Admin who reviewed the case
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP
);

TABLE "Document" (
    id TEXT PRIMARY KEY,
    "caseId" TEXT REFERENCES "Case"(id),
    "fileName" TEXT,
    "docType" VARCHAR, -- 'PASSPORT', 'AADHAAR', 'VOTER_ID', 'DRIVING_LICENSE', 'PAN'
    "ocrConfidence" DOUBLE PRECISION, -- 0 to 100 (below 75 indicates low confidence / potential forgery)
    "createdAt" TIMESTAMP
);

TABLE "AuditLog" (
    id TEXT PRIMARY KEY,
    "caseId" TEXT REFERENCES "Case"(id),
    action TEXT,
    "userId" TEXT REFERENCES "User"(id),
    "createdAt" TIMESTAMP
);

CRITICAL RULES:
1. The schema is completely provided above. DO NOT call 'sql_db_list_tables' or 'sql_db_schema'.
2. IMMEDIATELY call 'sql_db_query' on your VERY FIRST step with the constructed SQL query.
3. This is PostgreSQL: Always use double quotes around camelCase table and column names (e.g., "Case", "User", "Document", "AuditLog", "riskScore", "riskLevel", "personName", "officerId", "reviewedById", "ocrConfidence").
4. ONLY execute SELECT queries. Never perform modifications (INSERT, UPDATE, DELETE, DROP).
5. Limit results to at most {top_k} rows unless the user explicitly asks for all records.
6. For "high-risk cases" -> filter WHERE "riskLevel" = 'HIGH'
7. For "waiting for Admin review" -> filter WHERE status IN ('FLAGGED', 'PENDING_REVIEW') AND "reviewedById" IS NULL
8. For "OCR confidence below 75%" -> filter WHERE "ocrConfidence" < 75
9. When displaying cases, join "Case" with "User" on "officerId" = "User".id to show the assigned officer's name.
10. Format final output cleanly using Markdown tables.
"""


def get_db() -> SQLDatabase:
    """Connect to PostgreSQL using DATABASE_URL from .env"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set in .env")
    # Clean Prisma-specific query params (e.g. ?schema=public) that psycopg2 does not support
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    parsed = urlparse(db_url)
    if parsed.query:
        query_dict = parse_qs(parsed.query)
        query_dict.pop("schema", None)
        new_query = urlencode(query_dict, doseq=True)
        db_url = urlunparse(parsed._replace(query=new_query))

    return SQLDatabase.from_uri(
        db_url,
        sample_rows_in_table_info=1,
        include_tables=["User", "Case", "Document", "AuditLog"],
    )


def get_model(model_name: str | None = None):
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and ChatGroq:
        # qwen/qwen3.8-27b on Groq: 14,400 requests/day, sub-second latency, excellent SQL generation
        target_model = model_name or os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "600"))
        return ChatGroq(
            model=target_model,
            api_key=groq_key,
            temperature=0,
            max_tokens=max_tokens,
        )

    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key and ChatGoogleGenerativeAI:
        return ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            temperature=0,
            google_api_key=gemini_key,
        )

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key and ChatAnthropic:
        return ChatAnthropic(
            model="claude-sonnet-4-5-20250929",
            temperature=0,
            api_key=anthropic_key,
        )

    raise ValueError("No valid API key (GROQ_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY) found in .env")


def create_sql_agent(model_override=None):
    """Create and return the LangGraph text-to-SQL agent"""
    db = get_db()
    model = model_override or get_model()
    toolkit = SQLDatabaseToolkit(db=db, llm=model)
    # Give sql_db_query as primary tool since schema is already provided directly in prompt
    tools = [t for t in toolkit.get_tools() if t.name == "sql_db_query"]

    agent = create_react_agent(
        model,
        tools,
        prompt=SYSTEM_PROMPT.format(top_k=10),
    )
    return agent


# Cache the agent so we don't reconnect to DB and rebuild the graph on every request
_cached_agent = None


def get_agent():
    global _cached_agent
    if _cached_agent is None:
        _cached_agent = create_sql_agent()
    return _cached_agent


def run_query(question: str) -> str:
    """Run a natural language question and return the answer string with rate-limit resiliency."""
    try:
        agent = get_agent()
        result = agent.invoke({
            "messages": [{"role": "user", "content": question}]
        })
    except Exception as exc:
        err_str = str(exc)
        if "429" in err_str or "rate_limit" in err_str or "Request too large" in err_str:
            console.print("[yellow]Groq token/rate limit reached. Switching to fallback model...[/yellow]")
            try:
                # Fallback to openai/gpt-oss-120b on Groq or Gemini
                groq_key = os.getenv("GROQ_API_KEY")
                if groq_key and ChatGroq:
                    fb_model = ChatGroq(model="openai/gpt-oss-120b", api_key=groq_key, temperature=0, max_tokens=500)
                else:
                    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                    fb_model = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0, google_api_key=gemini_key)
                
                fb_agent = create_sql_agent(model_override=fb_model)
                result = fb_agent.invoke({
                    "messages": [{"role": "user", "content": question}]
                })
            except Exception as fb_exc:
                raise exc from fb_exc
        else:
            raise exc

    final_message = result["messages"][-1]
    if hasattr(final_message, "content"):
        content = final_message.content
        # Handle list content (tool call results)
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    return block["text"]
            return str(content)
        return str(content)
    return str(final_message)


# ---------------------------------------------------------------------------
# Flask API server
# ---------------------------------------------------------------------------
def run_server():
    """Start the Flask HTTP server on port 5100"""
    try:
        from flask import Flask, request, jsonify
    except ImportError:
        print("Flask not installed. Run: pip install flask")
        sys.exit(1)

    app = Flask(__name__)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "UP"})

    @app.route("/chat", methods=["POST"])
    def chat():
        data = request.get_json(silent=True) or {}
        question = (data.get("question") or "").strip()
        if not question:
            return jsonify({"error": "Missing 'question' in request body"}), 400

        try:
            answer = run_query(question)
            return jsonify({"answer": answer})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    console.print(Panel(
        "[bold green]SSB Admin Chatbot API[/bold green]\n"
        "Listening on [cyan]http://localhost:5100[/cyan]\n"
        "Endpoint: POST /chat  { \"question\": \"...\" }",
        border_style="green"
    ))
    app.run(host="0.0.0.0", port=5100, debug=False)


# ---------------------------------------------------------------------------
# CLI mode
# ---------------------------------------------------------------------------
def run_cli(question: str):
    console.print(Panel(
        f"[bold cyan]Question:[/bold cyan] {question}",
        border_style="cyan"
    ))
    console.print()
    console.print("[dim]Processing...[/dim]\n")

    try:
        answer = run_query(question)
        console.print(Panel(
            f"[bold green]Answer:[/bold green]\n\n{answer}",
            border_style="green"
        ))
    except Exception as e:
        console.print(Panel(
            f"[bold red]Error:[/bold red]\n\n{str(e)}",
            border_style="red"
        ))
        sys.exit(1)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="SSB Admin Text-to-SQL Chatbot — LangChain + Claude + PostgreSQL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python agent.py --serve
  python agent.py "Show me all high-risk cases"
  python agent.py "Which officer flagged the most cases?"
        """
    )
    parser.add_argument(
        "question",
        nargs="?",
        type=str,
        help="Natural language question (CLI mode). Omit to use --serve.",
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Start the Flask API server on port 5100",
    )
    args = parser.parse_args()

    if args.serve or not args.question:
        run_server()
    else:
        run_cli(args.question)


if __name__ == "__main__":
    main()
