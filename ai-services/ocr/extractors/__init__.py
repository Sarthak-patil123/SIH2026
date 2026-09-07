"""Document field extractor package.

Public API:
  extract_driving_licence(regions) -> DrivingLicenceFields
  extract_aadhaar(regions)         -> AadhaarFields
  extract_pan(regions)             -> PanFields
  extract_voter_id(regions)        -> VoterIdFields
"""
from .driving_licence import DrivingLicenceFields, extract_driving_licence
from .aadhaar import AadhaarFields, extract_aadhaar
from .pan import PanFields, extract_pan
from .voter_id import VoterIdFields, extract_voter_id

__all__ = [
    "DrivingLicenceFields",
    "extract_driving_licence",
    "AadhaarFields",
    "extract_aadhaar",
    "PanFields",
    "extract_pan",
    "VoterIdFields",
    "extract_voter_id",
]
