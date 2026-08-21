import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = "sqlite:///./planttrace.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String(100), nullable=False)
    scientific_name = Column(String(150), unique=True, nullable=False)
    conservation_status = Column(String(50), default="Least Concern")

    surveys = relationship("PlantSurvey", back_populates="species")

class PlantSurvey(Base):
    __tablename__ = "plant_surveys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    species_id = Column(Integer, ForeignKey("species.id"), nullable=False)
    confidence_score = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    plant_count = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    verified = Column(Boolean, default=True)
    surveyed_at = Column(DateTime, default=datetime.utcnow)

    species = relationship("Species", back_populates="surveys")