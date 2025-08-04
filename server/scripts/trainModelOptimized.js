const fs = require('fs');
const path = require('path');

// Simple logistic regression implementation for large datasets
class OptimizedLogisticRegression {
  constructor(options = {}) {
    this.learningRate = options.learningRate || 0.01;
    this.numIterations = options.numIterations || 1000;
    this.batchSize = options.batchSize || 1000;
    this.weights = null;
    this.bias = 0;
  }

  sigmoid(z) {
    // Clip z to prevent overflow
    const clipped = Math.max(-500, Math.min(500, z));
    return 1 / (1 + Math.exp(-clipped));
  }

  train(X, y) {
    const numFeatures = X[0].length;
    const numSamples = X.length;
    
    // Initialize weights
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    console.log(`Training with ${numSamples} samples, ${numFeatures} features`);

    // Mini-batch gradient descent
    for (let iteration = 0; iteration < this.numIterations; iteration++) {
      let totalLoss = 0;
      let batchesProcessed = 0;

      // Process in batches
      for (let batchStart = 0; batchStart < numSamples; batchStart += this.batchSize) {
        const batchEnd = Math.min(batchStart + this.batchSize, numSamples);
        const batchSize = batchEnd - batchStart;

        // Calculate gradients for this batch
        const weightGradients = new Array(numFeatures).fill(0);
        let biasGradient = 0;
        let batchLoss = 0;

        for (let i = batchStart; i < batchEnd; i++) {
          // Forward pass
          let z = this.bias;
          for (let j = 0; j < numFeatures; j++) {
            z += this.weights[j] * X[i][j];
          }
          
          const prediction = this.sigmoid(z);
          const error = prediction - y[i];
          
          // Calculate loss (cross-entropy)
          const epsilon = 1e-15; // Prevent log(0)
          const clippedPred = Math.max(epsilon, Math.min(1 - epsilon, prediction));
          batchLoss += -(y[i] * Math.log(clippedPred) + (1 - y[i]) * Math.log(1 - clippedPred));

          // Calculate gradients
          biasGradient += error;
          for (let j = 0; j < numFeatures; j++) {
            weightGradients[j] += error * X[i][j];
          }
        }

        // Update weights and bias
        this.bias -= (this.learningRate / batchSize) * biasGradient;
        for (let j = 0; j < numFeatures; j++) {
          this.weights[j] -= (this.learningRate / batchSize) * weightGradients[j];
        }

        totalLoss += batchLoss;
        batchesProcessed++;
      }

      // Log progress
      if (iteration % 100 === 0) {
        const avgLoss = totalLoss / numSamples;
        console.log(`Iteration ${iteration}, Average Loss: ${avgLoss.toFixed(4)}`);
      }
    }

    console.log('Training completed');
  }

  predict(X) {
    return X.map(sample => {
      let z = this.bias;
      for (let j = 0; j < this.weights.length; j++) {
        z += this.weights[j] * sample[j];
      }
      return this.sigmoid(z);
    });
  }

  predictBinary(X) {
    return this.predict(X).map(prob => prob >= 0.5 ? 1 : 0);
  }

  toJSON() {
    return {
      weights: this.weights,
      bias: this.bias,
      learningRate: this.learningRate,
      numIterations: this.numIterations
    };
  }

  static fromJSON(json) {
    const model = new OptimizedLogisticRegression();
    model.weights = json.weights;
    model.bias = json.bias;
    model.learningRate = json.learningRate;
    model.numIterations = json.numIterations;
    return model;
  }
}

// Paths
const DATA_DIR = path.resolve(__dirname, '../../ml_data/fake_news/processed');
const TRAIN_PATH = path.join(DATA_DIR, 'train_data.json');
const TEST_PATH = path.join(DATA_DIR, 'test_data.json');
const MODEL_PATH = path.join(DATA_DIR, 'logistic_regression_model.json');

// Load data in chunks to manage memory
function loadDataInChunks(filePath, chunkSize = 5000) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return { data, chunks };
}

function getXY(data) {
  const X = data.map(d => d.vector);
  const y = data.map(d => d.label);
  return { X, y };
}

function evaluate(yTrue, yPred) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 1 && yPred[i] === 0) fn++;
  }
  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = 2 * (precision * recall) / ((precision + recall) || 1);
  return { accuracy, precision, recall, f1, tp, tn, fp, fn };
}

async function main() {
  try {
    console.log('Loading training data...');
    const { data: trainData } = loadDataInChunks(TRAIN_PATH);
    console.log(`Loaded ${trainData.length} training samples`);

    console.log('Loading test data...');
    const { data: testData } = loadDataInChunks(TEST_PATH);
    console.log(`Loaded ${testData.length} test samples`);

    const { X: X_train, y: y_train } = getXY(trainData);
    const { X: X_test, y: y_test } = getXY(testData);

    console.log('Training Optimized Logistic Regression model...');
    const model = new OptimizedLogisticRegression({
      learningRate: 0.01,
      numIterations: 500,
      batchSize: 1000
    });

    model.train(X_train, y_train);

    console.log('Making predictions on test set...');
    const y_pred = model.predictBinary(X_test);

    // Evaluate
    const metrics = evaluate(y_test, y_pred);
    console.log('\n=== Model Evaluation ===');
    console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`Precision: ${(metrics.precision * 100).toFixed(2)}%`);
    console.log(`Recall: ${(metrics.recall * 100).toFixed(2)}%`);
    console.log(`F1-score: ${(metrics.f1 * 100).toFixed(2)}%`);
    console.log(`Confusion Matrix:`);
    console.log(`  TP: ${metrics.tp}, TN: ${metrics.tn}`);
    console.log(`  FP: ${metrics.fp}, FN: ${metrics.fn}`);

    // Save model
    console.log('\nSaving model...');
    fs.writeFileSync(MODEL_PATH, JSON.stringify(model.toJSON(), null, 2));
    console.log(`✅ Trained model saved to ${MODEL_PATH}`);

    // Test a few predictions with probabilities
    console.log('\n=== Sample Predictions ===');
    const samplePredictions = model.predict(X_test.slice(0, 5));
    for (let i = 0; i < 5; i++) {
      console.log(`Sample ${i + 1}: True=${y_test[i]}, Pred=${samplePredictions[i].toFixed(3)} (${samplePredictions[i] >= 0.5 ? 'FAKE' : 'REAL'})`);
    }

  } catch (error) {
    console.error('Error during model training:', error);
    process.exit(1);
  }
}

// Add memory monitoring
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log('\n=== Memory Usage ===');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}

main().then(() => {
  logMemoryUsage();
  console.log('\n🎉 Model training completed successfully!');
}).catch(err => {
  console.error('Fatal error during model training:', err);
  process.exit(1);
});
