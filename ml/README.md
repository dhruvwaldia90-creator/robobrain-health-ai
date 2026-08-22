# ML Training Pipeline

Trains the symptom→disease classifier used by the Symptom Analysis Agent.

## Dataset

Kaggle **"Disease Prediction Using Machine Learning"** — 4,920 cases × 132
binary symptoms → 41 diseases (GitHub mirror vendored in `ml/data/`).

## Train

```bash
pip install scikit-learn pandas numpy
python3 ml/train.py
```

The script compares multinomial logistic regression, Bernoulli Naive Bayes and
random forest on a stratified hold-out, refits the winner on the full data,
and exports weights to `ml/model.json`. Copy it into the app:

```bash
cp ml/model.json src/lib/ml/model.json
```

## Honest metrics

The dataset is synthetic and separable — holdout accuracy is 100% for every
model and means little. The meaningful number is the noisy-input eval in
`ml/eval_report.json` (half the symptoms dropped, two random ones added):

- **~93% top-1 accuracy, 100% top-3 accuracy**

In-browser inference (`src/lib/ml/classifier.ts`) is a pure TypeScript
dot-product + softmax — parity with sklearn `predict_proba` verified to 5e-7.
