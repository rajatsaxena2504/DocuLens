"""Script to seed the database with initial document types and sections."""
import json
import os
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import DocumentType, Section, DocumentTypeSection, SDLCStage


def load_json_file(filename: str) -> list:
    """Load JSON data from file."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, filename)
    with open(file_path, 'r') as f:
        return json.load(f)


def seed_sections(db: Session) -> dict:
    """Seed sections library and return id mapping."""
    sections_data = load_json_file('section_library.json')
    id_map = {}

    for section_data in sections_data:
        # Check if section already exists
        existing = db.query(Section).filter(Section.id == section_data['id']).first()
        if existing:
            id_map[section_data['id']] = existing.id
            continue

        section = Section(
            id=uuid.UUID(section_data['id']),
            name=section_data['name'],
            description=section_data['description'],
            default_order=section_data.get('default_order'),
            is_system=True,
        )
        db.add(section)
        id_map[section_data['id']] = section.id

    db.commit()
    print(f"Seeded {len(sections_data)} sections")
    return id_map


def get_stage_map(db: Session) -> dict:
    """Get a mapping of stage names to stage IDs."""
    stages = db.query(SDLCStage).all()
    return {stage.name: stage.id for stage in stages}


def seed_document_types(db: Session, section_id_map: dict) -> None:
    """Seed document types with their default sections."""
    doc_types_data = load_json_file('document_types.json')
    stage_map = get_stage_map(db)

    for doc_type_data in doc_types_data:
        # Check if document type already exists
        existing = db.query(DocumentType).filter(DocumentType.id == doc_type_data['id']).first()

        # Get stage_id from stage name
        stage_name = doc_type_data.get('stage')
        stage_id = stage_map.get(stage_name) if stage_name else None

        if existing:
            # Update stage_id if it changed
            if stage_id and existing.stage_id != stage_id:
                existing.stage_id = stage_id
            continue

        doc_type = DocumentType(
            id=uuid.UUID(doc_type_data['id']),
            name=doc_type_data['name'],
            description=doc_type_data['description'],
            is_system=True,
            stage_id=stage_id,
        )
        db.add(doc_type)
        db.flush()

        # Add default sections mapping
        for order, section_id in enumerate(doc_type_data.get('default_sections', []), start=1):
            if section_id in section_id_map:
                mapping = DocumentTypeSection(
                    document_type_id=doc_type.id,
                    section_id=section_id_map[section_id],
                    default_order=order,
                    is_required=order <= 2,  # First 2 sections are required
                )
                db.add(mapping)

    db.commit()
    print(f"Seeded {len(doc_types_data)} document types")


def run_seed():
    """Run all seed operations."""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Starting database seed...")
        section_id_map = seed_sections(db)
        seed_document_types(db, section_id_map)
        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
