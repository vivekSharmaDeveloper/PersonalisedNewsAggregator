const fs = require('fs');
const path = require('path');
const LogisticRegression = require('ml-logistic-regression');
const { Matrix } = require('ml-matrix');

// Paths
const DATA_DIR = path.resolve(__dirname, '../../ml_data/fake_news/processed');
const TRAIN_PATH = path.join(DATA_DIR, 'train_data.json');
const TEST_PATH = path.join(DATA_DIR, 'test_data.json');
const MODEL_PATH = path.join(DATA_DIR, 'logistic_regression_model.json');

// Load data
function loadData(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getXY(data) {
  // X: features, y: labels
  const X = data.map(d => d.vector);
  const y = data.map(d => d.label);
  return { X, y: Matrix.columnVector(y) };
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
  console.log('Loading data...');
  const trainData = loadData(TRAIN_PATH);
  const testData = loadData(TEST_PATH);
  const { X: X_train, y: y_train } = getXY(trainData);
  const { X: X_test, y: y_test } = getXY(testData);

  console.log('Training Logistic Regression model...');
  const X_train_matrix = new Matrix(X_train);
  const logreg = new LogisticRegression({ numSteps: 100, learningRate: 5e-3 });
  logreg.train(X_train_matrix, y_train);

  // Predict on test set
  const X_test_matrix = new Matrix(X_test);
  const y_pred = logreg.predict(X_test_matrix).map(p => (p >= 0.5 ? 1 : 0));

  // Evaluate
  const metrics = evaluate(y_test.to1DArray(), y_pred);
  console.log('Model evaluation:');
  console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`Precision: ${(metrics.precision * 100).toFixed(2)}%`);
  console.log(`Recall: ${(metrics.recall * 100).toFixed(2)}%`);
  console.log(`F1-score: ${(metrics.f1 * 100).toFixed(2)}%`);
  console.log(`TP: ${metrics.tp}, TN: ${metrics.tn}, FP: ${metrics.fp}, FN: ${metrics.fn}`);

  // Save model
  fs.writeFileSync(MODEL_PATH, JSON.stringify(logreg.toJSON(), null, 2));
  console.log('Trained model saved to', MODEL_PATH);
}

main().catch(err => {
  console.error('Error during model training:', err);
}); 