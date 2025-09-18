

# 🍏 Nutrient Scanner App

This is a full-stack web application that allows users to scan food items using their camera or enter barcodes to get real-time nutrition information. It's built with **Python (Flask)** for the backend and **HTML, CSS, and JavaScript** for the frontend.

## ✨ Features

  * **Photo Recognition:** Scan a food item with your camera or upload an image to get an estimated food name and its nutritional information. This feature uses a pre-trained **MobileNetV2** model for fast and efficient image classification.
  * **Barcode Scanning:** Use your device's camera to scan a product barcode and retrieve its detailed nutrition facts from the USDA FoodData Central database.
  * **Manual Calculator:** Manually enter nutrition data from a product label and scale it to your desired portion size.
  * **Responsive Design:** The user interface is designed to work seamlessly on both desktop and mobile devices.

-----

## 🛠️ Technologies Used

  * **Backend:**
      * **Flask:** A lightweight Python web framework.
      * **TensorFlow/Keras:** For loading and running the MobileNetV2 image recognition model.
      * **Pillow:** For image processing and manipulation.
      * **Requests:** For making API calls to the USDA FoodData Central database.
  * **Frontend:**
      * **HTML5:** For the application's structure.
      * **CSS3:** For styling and layout.
      * **JavaScript:** For handling all user interactions and communication with the backend.
      * **QuaggaJS:** A JavaScript library for live barcode detection and scanning.

-----

## 🚀 Getting Started

### Prerequisites

  * **Python 3.7+**
  * **pip** (Python package installer)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/nutrition-scanner.git
    cd nutrition-scanner
    ```

2.  **Create a virtual environment** (recommended):

    ```bash
    python -m venv myenv
    # On Windows
    .\myenv\Scripts\activate
    # On macOS/Linux
    source myenv/bin/activate
    ```

3.  **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up the USDA FoodData Central API Key:**
    Get your free API key from the [USDA website](https://www.google.com/search?q=https://fdc.nal.usda.gov/api-key.html).
    Set the API key as an environment variable before running the app.

    ```bash
    # On Windows
    set USDA_API_KEY="YOUR_API_KEY_HERE"
    # On macOS/Linux
    export USDA_API_KEY="YOUR_API_KEY_HERE"
    ```

    Alternatively, you can paste the key directly into `app.py`.

5.  **Run the application:**

    ```bash
    python app.py
    ```



-----

## 📝 Project Structure

```
nutrition-scanner/
├── app.py                  # Flask backend
├── requirements.txt        # Python dependencies
├── static/
│   ├── style.css           # CSS for styling
│   └── script.js           # Frontend logic (AJAX, camera, QuaggaJS)
└── templates/
    └── index.html          # Main HTML page
```

-----

## ⚠️ Troubleshooting

  * **`Image recognition model is not loaded`**: This error often occurs due to a corrupted TensorFlow model file. To fix it, manually delete the model's weights cache and restart the app.

      * Navigate to your user directory's `.keras` folder (`C:\Users\ari-1757\.keras` on Windows, `~/.keras` on macOS/Linux).
      * Go into the `models` folder.
      * Delete the file starting with `mobilenet_v2_weights...`.
      * Restart `app.py`, and the correct file will be re-downloaded automatically.

  * **`QuaggaJS library not loaded`**: Ensure you have a stable internet connection. If the issue persists, download the `quagga.min.js` file and place it in your `static` folder, then update the `<script>` tag in `index.html` to point to the local file.

-----

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the application.
