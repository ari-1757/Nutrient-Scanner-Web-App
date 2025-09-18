let currentNutritionDataStatic = {};
let currentNutritionDataLive = {};
let currentNutritionDataBarcode = {};
let model;
let isPhotoScanning = false;
let isBarcodeScanning = false;

// === Initialization ===
(async () => {
    console.log('Loading MobileNet model...');
    model = await mobilenet.load();
    console.log('Model loaded successfully.');
    // Initial view
    showSection('photo-static');
})();

// === Navigation Logic ===
const navLinks = document.querySelectorAll('.nav-link');
const cardGroups = document.querySelectorAll('.card-group');

navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        showSection(targetId);
    });
});

function showSection(targetId) {
    stopAllScanners();
    cardGroups.forEach(group => {
        group.style.display = 'none';
    });
    document.getElementById(targetId).style.display = 'grid';

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').substring(1) === targetId) {
            link.classList.add('active');
        }
    });
}

// Helper function to stop all active scanners
function stopAllScanners() {
    const photoScannerVideo = document.getElementById('photoScannerVideo');
    const barcodeScannerVideo = document.getElementById('barcodeScannerVideo');
    const startPhotoScannerBtn = document.getElementById('startPhotoScannerBtn');
    const stopPhotoScannerBtn = document.getElementById('stopPhotoScannerBtn');
    const startBarcodeScannerBtn = document.getElementById('startBarcodeScannerBtn');
    const stopBarcodeScannerBtn = document.getElementById('stopBarcodeScannerBtn');

    if (isPhotoScanning) {
        const stream = photoScannerVideo.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        photoScannerVideo.style.display = 'none';
        stopPhotoScannerBtn.style.display = 'none';
        startPhotoScannerBtn.style.display = 'block';
        isPhotoScanning = false;
    }
    if (isBarcodeScanning) {
        Quagga.stop();
        const stream = barcodeScannerVideo.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        barcodeScannerVideo.style.display = 'none';
        stopBarcodeScannerBtn.style.display = 'none';
        startBarcodeScannerBtn.style.display = 'block';
        isBarcodeScanning = false;
    }
}

// === Photo Recognition (Static Image) ===
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const predictionLabelStatic = document.getElementById('predictionLabelStatic');
const predictionConfidenceStatic = document.getElementById('predictionConfidenceStatic');
const fetchNutritionBtnStatic = document.getElementById('fetchNutritionBtnStatic');
const portionSizeStatic = document.getElementById('portionSizeStatic');
const nutritionResultsStatic = document.getElementById('nutritionResultsStatic');

imageUpload.addEventListener('change', async (event) => {
    stopAllScanners();
    const file = event.target.files[0];
    if (!file) return;

    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = 'block';

    const image = new Image();
    image.src = imagePreview.src;
    image.onload = async () => {
        predictionLabelStatic.textContent = 'Analyzing...';
        predictionConfidenceStatic.textContent = '';
        fetchNutritionBtnStatic.disabled = true;
        nutritionResultsStatic.style.display = 'none';

        try {
            const predictions = await model.classify(image);
            if (predictions.length > 0) {
                const topPrediction = predictions[0];
                predictionLabelStatic.textContent = topPrediction.className.split(',')[0].trim();
                predictionConfidenceStatic.textContent = `${(topPrediction.probability * 100).toFixed(2)}%`;
                fetchNutritionBtnStatic.disabled = false;
            } else {
                predictionLabelStatic.textContent = 'Could not identify food.';
            }
        } catch (error) {
            console.error('Error during image classification:', error);
            predictionLabelStatic.textContent = 'Classification failed.';
        }
    };
});

fetchNutritionBtnStatic.addEventListener('click', async () => {
    const foodLabel = predictionLabelStatic.textContent.split(',')[0].trim();
    if (foodLabel !== 'None' && foodLabel !== 'Analyzing...' && foodLabel !== 'Classification failed.') {
        fetchNutritionDataByLabel(foodLabel, 'static');
    }
});

// === Real-Time Photo Scan ===
const photoScannerVideo = document.getElementById('photoScannerVideo');
const startPhotoScannerBtn = document.getElementById('startPhotoScannerBtn');
const stopPhotoScannerBtn = document.getElementById('stopPhotoScannerBtn');
const predictionLabelLive = document.getElementById('predictionLabelLive');
const predictionConfidenceLive = document.getElementById('predictionConfidenceLive');
const fetchNutritionBtnLive = document.getElementById('fetchNutritionBtnLive');
const portionSizeLive = document.getElementById('portionSizeLive');
const nutritionResultsLive = document.getElementById('nutritionResultsLive');

startPhotoScannerBtn.addEventListener('click', async () => {
    stopAllScanners();
    isPhotoScanning = true;
    stopPhotoScannerBtn.style.display = 'block';
    startPhotoScannerBtn.style.display = 'none';
    photoScannerVideo.style.display = 'block';
    fetchNutritionBtnLive.disabled = true;
    nutritionResultsLive.style.display = 'none';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        photoScannerVideo.srcObject = stream;
        await photoScannerVideo.play();
        
        let lastPredictionTime = 0;
        const classifyFrame = async (timestamp) => {
            if (!isPhotoScanning) return;
            
            // Throttle the predictions to once every 500ms
            if (timestamp - lastPredictionTime > 500) {
                lastPredictionTime = timestamp;
                const predictions = await model.classify(photoScannerVideo);
                
                if (predictions.length > 0) {
                    const topPrediction = predictions[0];
                    predictionLabelLive.textContent = topPrediction.className.split(',')[0].trim();
                    predictionConfidenceLive.textContent = `${(topPrediction.probability * 100).toFixed(2)}%`;
                    fetchNutritionBtnLive.disabled = false;
                }
            }
            requestAnimationFrame(classifyFrame);
        };
        classifyFrame();
    } catch (error) {
        console.error('Error accessing webcam:', error);
        alert('Could not access the camera. Please ensure it is not in use and you have granted permission.');
        stopAllScanners();
    }
});

stopPhotoScannerBtn.addEventListener('click', () => {
    stopAllScanners();
    predictionLabelLive.textContent = 'None';
    predictionConfidenceLive.textContent = '0%';
    fetchNutritionBtnLive.disabled = true;
    nutritionResultsLive.style.display = 'none';
});

fetchNutritionBtnLive.addEventListener('click', async () => {
    const foodLabel = predictionLabelLive.textContent.split(',')[0].trim();
    if (foodLabel !== 'None') {
        stopAllScanners();
        fetchNutritionDataByLabel(foodLabel, 'live');
    }
});

// === Barcode Scanning ===
const barcodeScannerVideo = document.getElementById('barcodeScannerVideo');
const startBarcodeScannerBtn = document.getElementById('startBarcodeScannerBtn');
const stopBarcodeScannerBtn = document.getElementById('stopBarcodeScannerBtn');
const barcodeResultSpan = document.getElementById('barcodeResult');
const portionSizeBarcode = document.getElementById('portionSizeBarcode');
const nutritionResultsBarcode = document.getElementById('nutritionResultsBarcode');

startBarcodeScannerBtn.addEventListener('click', async () => {
    stopAllScanners();
    isBarcodeScanning = true;
    barcodeScannerVideo.style.display = 'block';
    startBarcodeScannerBtn.style.display = 'none';
    stopBarcodeScannerBtn.style.display = 'block';
    barcodeResultSpan.textContent = 'Scanning...';
    nutritionResultsBarcode.style.display = 'none';
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        barcodeScannerVideo.srcObject = stream;
        await barcodeScannerVideo.play();
    } catch (error) {
        console.error('Error accessing webcam for barcode:', error);
        alert('Could not access the camera for barcode scanning. Please grant permission.');
        stopAllScanners();
        return;
    }

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: barcodeScannerVideo,
            constraints: { facingMode: "environment" },
        },
        decoder: {
            readers: ["ean_reader", "upc_reader", "upc_a_reader", "ean_8_reader"]
        }
    }, (err) => {
        if (err) {
            console.error("QuaggaJS init error:", err);
            alert('Error starting scanner: ' + err.name);
            stopAllScanners();
            return;
        }
        console.log("Initialization finished. Ready to start.");
        Quagga.start();
    });

    Quagga.onDetected(async (data) => {
        const barcode = data.codeResult.code;
        barcodeResultSpan.textContent = barcode;
        stopAllScanners();
        fetchNutritionDataByBarcode(barcode);
    });
});

stopBarcodeScannerBtn.addEventListener('click', () => {
    stopAllScanners();
    barcodeResultSpan.textContent = 'None';
    nutritionResultsBarcode.style.display = 'none';
});

// === Nutrition Fetching & Display ===

async function fetchNutritionDataByBarcode(barcode) {
    const resultsDiv = nutritionResultsBarcode;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<h3>Searching...</h3>';
    
    try {
        const response = await fetch(`/api/product/${barcode}`);
        const data = await response.json();
        
        if (response.ok) {
            currentNutritionDataBarcode = data;
            displayNutritionData(data, 'barcode');
        } else {
            resultsDiv.innerHTML = `<h3>❌ Barcode not found: ${data.error}</h3>`;
        }
    } catch (error) {
        console.error('Error fetching barcode data:', error);
        resultsDiv.innerHTML = `<h3>❌ Error fetching data.</h3>`;
    }
}

async function fetchNutritionDataByLabel(label, type) {
    const resultsDiv = type === 'static' ? nutritionResultsStatic : nutritionResultsLive;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<h3>Searching...</h3>';

    try {
        const response = await fetch(`/api/search_food?q=${label}`);
        const data = await response.json();
        
        if (response.ok) {
            if (type === 'static') {
                currentNutritionDataStatic = data;
            } else {
                currentNutritionDataLive = data;
            }
            displayNutritionData(data, type);
        } else {
            resultsDiv.innerHTML = `<h3>❌ Food not found: ${data.error}</h3>`;
        }
    } catch (error) {
        console.error('Error fetching food data:', error);
        resultsDiv.innerHTML = `<h3>❌ Error fetching data.</h3>`;
    }
}

function displayNutritionData(data, type) {
    let portionInput, resultsDiv;

    if (type === 'static') {
        portionInput = portionSizeStatic;
        resultsDiv = nutritionResultsStatic;
    } else if (type === 'live') {
        portionInput = portionSizeLive;
        resultsDiv = nutritionResultsLive;
    } else {
        portionInput = portionSizeBarcode;
        resultsDiv = nutritionResultsBarcode;
    }

    const servingSize = data.serving_size_g || 100;
    const portionSize = parseFloat(portionInput.value) || servingSize;
    const scalingFactor = portionSize / servingSize;

    const calories = (data.calories_kcal * scalingFactor).toFixed(2);
    const protein = (data.protein_g * scalingFactor).toFixed(2);
    const carbs = (data.carbs_g * scalingFactor).toFixed(2);
    const fat = (data.fat_g * scalingFactor).toFixed(2);
    const allergens = data.allergens || 'None specified';

    resultsDiv.innerHTML = `
        <h3>Nutrition Info per ${portionSize}g:</h3>
        <p>Calories: ${calories} kcal</p>
        <p>Protein: ${protein} g</p>
        <p>Carbs: ${carbs} g</p>
        <p>Fat: ${fat} g</p>
        <p>Allergens: ${allergens}</p>
    `;
    resultsDiv.style.display = 'block';
}

// === Manual Nutrition Calculator ===
const manualCaloriesInput = document.getElementById('manualCalories');
const manualProteinInput = document.getElementById('manualProtein');
const manualCarbsInput = document.getElementById('manualCarbs');
const manualFatInput = document.getElementById('manualFat');
const manualServingSizeInput = document.getElementById('manualServingSize');
const manualPortionSizeInput = document.getElementById('manualPortionSize');
const manualCalculateBtn = document.getElementById('manualCalculateBtn');
const manualResultsDiv = document.getElementById('manualNutritionResults');

manualCalculateBtn.addEventListener('click', () => {
    const caloriesPerServing = parseFloat(manualCaloriesInput.value) || 0;
    const proteinPerServing = parseFloat(manualProteinInput.value) || 0;
    const carbsPerServing = parseFloat(manualCarbsInput.value) || 0;
    const fatPerServing = parseFloat(manualFatInput.value) || 0;
    const servingSize = parseFloat(manualServingSizeInput.value) || 100;
    const portionSize = parseFloat(manualPortionSizeInput.value) || 100;

    if (servingSize === 0) {
        alert('Serving size cannot be zero.');
        return;
    }

    const scalingFactor = portionSize / servingSize;

    const scaledCalories = (caloriesPerServing * scalingFactor).toFixed(2);
    const scaledProtein = (proteinPerServing * scalingFactor).toFixed(2);
    const scaledCarbs = (carbsPerServing * scalingFactor).toFixed(2);
    const scaledFat = (fatPerServing * scalingFactor).toFixed(2);

    document.getElementById('manualPortionSizeDisplay').textContent = portionSize;
    document.getElementById('manualCaloriesDisplay').textContent = scaledCalories;
    document.getElementById('manualProteinDisplay').textContent = scaledProtein;
    document.getElementById('manualCarbsDisplay').textContent = scaledCarbs;
    document.getElementById('manualFatDisplay').textContent = scaledFat;
    manualResultsDiv.style.display = 'block';
});

// Event listeners for portion size inputs
portionSizeStatic.addEventListener('input', () => {
    if (Object.keys(currentNutritionDataStatic).length > 0) {
        displayNutritionData(currentNutritionDataStatic, 'static');
    }
});
portionSizeLive.addEventListener('input', () => {
    if (Object.keys(currentNutritionDataLive).length > 0) {
        displayNutritionData(currentNutritionDataLive, 'live');
    }
});
portionSizeBarcode.addEventListener('input', () => {
    if (Object.keys(currentNutritionDataBarcode).length > 0) {
        displayNutritionData(currentNutritionDataBarcode, 'barcode');
    }
});