from fastapi import FastAPI, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from models import Base, engine, SessionLocal, PlantSurvey, Species
from classifier import predict_plant

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PlantTrace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/v1/classify")
async def classify_image(file: UploadFile = File(...)):
    contents = await file.read()
    return predict_plant(contents)

@app.post("/api/v1/surveys")
async def create_survey(
    latitude: float = Form(...),
    longitude: float = Form(...),
    species_name: str = Form(...),
    scientific_name: str = Form(...),
    confidence: float = Form(...),
    plant_count: int = Form(1),
    notes: str = Form(""),
    db: Session = Depends(get_db)
):
    species = db.query(Species).filter(Species.scientific_name == scientific_name).first()
    if not species:
        species = Species(
            common_name=species_name,
            scientific_name=scientific_name,
            conservation_status="Least Concern"
        )
        db.add(species)
        db.commit()
        db.refresh(species)

    survey = PlantSurvey(
        species_id=species.id,
        confidence_score=confidence,
        latitude=latitude,
        longitude=longitude,
        plant_count=plant_count,
        notes=notes,
        verified=True
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)

    return {"status": "success", "survey_id": survey.id}

@app.get("/api/v1/surveys/geojson")
def get_surveys_geojson(db: Session = Depends(get_db)):
    results = db.query(PlantSurvey).join(Species).filter(PlantSurvey.verified == True).all()

    features = []
    for s in results:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [s.longitude, s.latitude]
            },
            "properties": {
                "id": s.id,
                "species": s.species.common_name,
                "scientific_name": s.species.scientific_name,
                "status": s.species.conservation_status,
                "confidence": s.confidence_score,
                "count": s.plant_count,
                "notes": s.notes,
                "surveyed_at": s.surveyed_at.strftime("%Y-%m-%d %H:%M")
            }
        })

    return {"type": "FeatureCollection", "features": features}