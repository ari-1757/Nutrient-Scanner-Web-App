import os
import requests
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# It's better to get the API key from an environment variable for security
# If you don't want to use environment variables, you can paste your key here:
# USDA_API_KEY = "YOUR_API_KEY_HERE"
# If you want to use the environment variable, run `export USDA_API_KEY="YOUR_KEY"` before starting the app.
USDA_API_KEY = os.environ.get("USDA_API_KEY", "2ccgpHDUviBDqSdlnQOt0WgcauQ6K4hbfb8yZFKF")
USDA_FDC_URL = "https://api.nal.usda.gov/fdc/v1"

# Helper function to get nutrition data from a USDA FDC product JSON
def get_nutrition_from_fdc_data(product_data):
    """
    Extracts key nutrition data from a USDA FDC branded food item.
    """
    if not product_data or 'foodNutrients' not in product_data:
        print("Debug: No foodNutrients field found in product data.")
        return None

    nutrients = {
        'calories_kcal': 0,
        'protein_g': 0,
        'carbs_g': 0,
        'fat_g': 0,
    }

    # FDC nutrient IDs (common ones)
    nutrient_ids = {
        'calories_kcal': 1008,
        'protein_g': 1003,
        'fat_g': 1004,
        'carbs_g': 1005,
    }
    
    # Check for serving size in branded foods
    serving_size_g = 100.0
    if 'servingSize' in product_data and 'servingSizeUnit' in product_data:
        if product_data['servingSizeUnit'].lower() == 'g':
            serving_size_g = float(product_data['servingSize'])
        else:
            serving_size_g = 100.0
    
    # Extract nutrient values
    for nutrient in product_data['foodNutrients']:
        nutrient_id = nutrient['nutrient']['id']
        if nutrient_id == nutrient_ids['calories_kcal']:
            nutrients['calories_kcal'] = nutrient['amount']
        elif nutrient_id == nutrient_ids['protein_g']:
            nutrients['protein_g'] = nutrient['amount']
        elif nutrient_id == nutrient_ids['fat_g']:
            nutrients['fat_g'] = nutrient['amount']
        elif nutrient_id == nutrient_ids['carbs_g']:
            nutrients['carbs_g'] = nutrient['amount']

    return {
        "calories_kcal": nutrients['calories_kcal'],
        "protein_g": nutrients['protein_g'],
        "carbs_g": nutrients['carbs_g'],
        "fat_g": nutrients['fat_g'],
        "serving_size_g": serving_size_g,
        "allergens": product_data.get('householdServingFullText', 'None specified')
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/product/<barcode>')
def get_product_by_barcode(barcode):
    """Fetches nutrition data for a barcode."""
    url = f"{USDA_FDC_URL}/foods/search"
    params = {
        'api_key': USDA_API_KEY,
        'query': barcode,
        'dataType': ['Branded'],
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get('foods'):
            for food in data['foods']:
                if food.get('brandedFoodCategory'):
                    fdc_id = food['fdcId']
                    details_url = f"{USDA_FDC_URL}/food/{fdc_id}"
                    details_params = {'api_key': USDA_API_KEY}
                    details_response = requests.get(details_url, params=details_params)
                    details_response.raise_for_status()
                    details_data = details_response.json()
                    
                    nutrition_info = get_nutrition_from_fdc_data(details_data)
                    if nutrition_info:
                        return jsonify(nutrition_info)
            
            return jsonify({"error": "No branded food found for this barcode."}), 404
        else:
            return jsonify({"error": "Product not found."}), 404
    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to connect to USDA API. {e}")
        return jsonify({"error": "Failed to connect to the nutrition database."}), 500

@app.route('/api/search_food')
def search_food_by_label():
    """Searches for nutrition data by food name."""
    label = request.args.get('q')
    if not label:
        return jsonify({"error": "Query parameter 'q' is required."}), 400

    url = f"{USDA_FDC_URL}/foods/search"
    params = {
        'api_key': USDA_API_KEY,
        'query': label,
        'dataType': ['Branded', 'SR Legacy'], # Search branded and general foods
        'pageSize': 1,
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get('foods'):
            first_food = data['foods'][0]
            fdc_id = first_food['fdcId']
            
            details_url = f"{USDA_FDC_URL}/food/{fdc_id}"
            details_params = {'api_key': USDA_API_KEY}
            details_response = requests.get(details_url, params=details_params)
            details_response.raise_for_status()
            details_data = details_response.json()
            
            nutrition_info = get_nutrition_from_fdc_data(details_data)
            if nutrition_info:
                return jsonify(nutrition_info)
            else:
                return jsonify({"error": f"No detailed nutrition data found for '{label}'."}), 404

        return jsonify({"error": f"No food found for '{label}'."}), 404
    
    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to connect to USDA API. {e}")
        return jsonify({"error": "Failed to connect to the nutrition database."}), 500

@app.route('/api/scale_nutrition', methods=['POST'])
def scale_nutrition():
    data = request.json
    try:
        nutrients = data['nutrients']
        serving_size = float(data['serving_size_g'])
        desired_grams = float(data['desired_grams'])

        if serving_size <= 0:
            return jsonify({"error": "Serving size must be greater than zero."}), 400
        
        scale_factor = desired_grams / serving_size
        
        scaled_nutrients = {
            "calories": nutrients['calories'] * scale_factor,
            "protein": nutrients['protein'] * scale_factor,
            "carbs": nutrients['carbs'] * scale_factor,
            "fat": nutrients['fat'] * scale_factor
        }
        
        return jsonify(scaled_nutrients)
    except (KeyError, ValueError, TypeError) as e:
        print(f"Error: Invalid payload. {e}")
        return jsonify({"error": "Invalid input for scaling nutrition."}), 400

if __name__ == '__main__':
    app.run(debug=True)