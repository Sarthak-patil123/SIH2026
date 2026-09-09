import { DocumentRecord } from "./document.types";

/**
 * Repository for persisting document verification records.
 *
 * TODO: Wire to Prisma client once the `Document` model is added to schema.prisma.
 * The interface is ready — swap the in-memory map for Prisma calls.
 */
export class DocumentRepository {
  /** In-memory store used until Prisma schema is finalized. */
  private readonly store = new Map<string, DocumentRecord>();

  /**
   * Persist a document verification record.
   */
  async save(record: DocumentRecord): Promise<DocumentRecord> {
    this.store.set(record.id, record);
    return record;
  }

  /**
   * Retrieve a document record by ID.
   */
  async findById(id: string): Promise<DocumentRecord | null> {
    return this.store.get(id) ?? null;
  }

  /**
   * Retrieve all document records (paginated once DB is wired).
   */
  async findAll(): Promise<DocumentRecord[]> {
    return Array.from(this.store.values());
  }

  /**
   * Delete a record by ID.
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

export const documentRepository = new DocumentRepository();
