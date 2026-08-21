import io
from PIL import Image
import torch
import torchvision.transforms as transforms
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

weights = MobileNet_V3_Small_Weights.DEFAULT
model = mobilenet_v3_small(weights=weights)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def predict_plant(image_bytes: bytes) -> dict:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        top_prob, top_cat_id = torch.topk(probabilities, 1)

    predicted_label = weights.meta["categories"][top_cat_id.item()]
    confidence = float(top_prob.item())

    clean_name = predicted_label.replace("_", " ").title()
    return {
        "species_name": clean_name,
        "scientific_name": f"{clean_name} spec.",
        "confidence": round(confidence, 4)
    }