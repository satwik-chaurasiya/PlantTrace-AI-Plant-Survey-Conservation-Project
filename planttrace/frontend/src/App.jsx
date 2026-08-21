import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";

// Standard Leaflet marker icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function App() {
  const [geoData, setGeoData] = useState([]);
  const [coords, setCoords] = useState({ lat: 28.4744, lng: 77.5040 }); // Default region
  const [prediction, setPrediction] = useState(null);
  const [plantCount, setPlantCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch observations
  const fetchSurveys = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/v1/surveys/geojson");
      setGeoData(res.data.features);
    } catch (err) {
      console.error("Failed to load map data", err);
    }
  };

  useEffect(() => {
    const loadSurveys = async () => {
      await fetchSurveys();
    };

    loadSurveys();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Geolocation permission denied")
      );
    }
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/api/v1/classify", formData);
      setPrediction(res.data);
    } catch {
      alert("Classification failed. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySubmit = async (e) => {
    e.preventDefault();
    if (!prediction) return;

    const formData = new FormData();
    formData.append("latitude", coords.lat);
    formData.append("longitude", coords.lng);
    formData.append("species_name", prediction.species_name);
    formData.append("scientific_name", prediction.scientific_name);
    formData.append("confidence", prediction.confidence);
    formData.append("plant_count", plantCount);
    formData.append("notes", notes);

    try {
      await axios.post("http://localhost:8000/api/v1/surveys", formData);
      setPrediction(null);
      setNotes("");
      fetchSurveys();
      alert("Survey recorded successfully!");
    } catch {
      alert("Failed to submit survey.");
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>🌿 PlantTrace</h2>
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "-10px" }}>
          AI Plant Survey & Conservation Mapping
        </p>

        <div className="form-group">
          <label><strong>1. Upload / Snap Plant Photo</strong></label>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
          {loading && <p style={{ color: "#0284c7" }}>Analyzing Image...</p>}
        </div>

        {prediction && (
          <form onSubmit={handleSurveySubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="badge">
              <strong>Detected:</strong> {prediction.species_name} <br />
              <strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(1)}%
            </div>

            <div className="form-group">
              <label>Location (Lat / Lng)</label>
              <input
                type="text"
                disabled
                value={`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
              />
            </div>

            <div className="form-group">
              <label>Plant Count</label>
              <input
                type="number"
                min="1"
                value={plantCount}
                onChange={(e) => setPlantCount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Notes / Habitat</label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observed near wetlands..."
              />
            </div>

            <button type="submit" className="primary-btn">Save Observation</button>
          </form>
        )}
      </div>

      <div className="map-pane">
        <MapContainer center={[coords.lat, coords.lng]} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap lat={coords.lat} lng={coords.lng} />

          {geoData.map((feature) => (
            <Marker
              key={feature.properties.id}
              position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            >
              <Popup>
                <div style={{ minWidth: "150px" }}>
                  <h4 style={{ margin: "0 0 4px 0" }}>{feature.properties.species}</h4>
                  <p style={{ margin: 0, fontSize: "12px", fontStyle: "italic", color: "#64748b" }}>
                    {feature.properties.scientific_name}
                  </p>
                  <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                  <p style={{ margin: "2px 0", fontSize: "12px" }}>
                    <strong>Count:</strong> {feature.properties.count}
                  </p>
                  <p style={{ margin: "2px 0", fontSize: "12px" }}>
                    <strong>Surveyed:</strong> {feature.properties.surveyed_at}
                  </p>
                  {feature.properties.notes && (
                    <p style={{ margin: "2px 0", fontSize: "12px" }}>
                      <strong>Notes:</strong> {feature.properties.notes}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}