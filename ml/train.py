"""Train a symptom->disease classifier on the Kaggle Disease Prediction dataset.

Compares multinomial logistic regression, Bernoulli Naive Bayes and random
forest on a stratified hold-out, then exports the winner's weights to JSON so
the web app can run inference in pure TypeScript (no server, no ONNX runtime).

Dataset: Kaggle "Disease Prediction Using Machine Learning"
  4,920 rows x 132 binary symptoms -> 41 diseases (GitHub mirror in ml/data/).

Usage: python3 ml/train.py
Outputs: ml/model.json, ml/eval_report.json
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, top_k_accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import BernoulliNB

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"


def load() -> tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    train = pd.read_csv(DATA / "Training.csv")
    test = pd.read_csv(DATA / "Testing.csv")
    # the Kaggle export ships a stray empty trailing column
    train = train.loc[:, ~train.columns.str.startswith("Unnamed")]
    test = test.loc[:, ~test.columns.str.startswith("Unnamed")]
    symptoms = [c.strip() for c in train.columns if c != "prognosis"]
    train.columns = [c.strip() for c in train.columns]
    test.columns = [c.strip() for c in test.columns]
    return train[symptoms], train["prognosis"], test[symptoms], test["prognosis"]


def main() -> None:
    X, y, X_test, y_test = load()
    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    candidates = {
        "logreg": LogisticRegression(max_iter=2000, C=1.0),
        "bernoulli_nb": BernoulliNB(),
        "random_forest": RandomForestClassifier(
            n_estimators=200, random_state=42, n_jobs=-1
        ),
    }

    report: dict[str, dict[str, float]] = {}
    fitted = {}
    for name, clf in candidates.items():
        clf.fit(X_tr, y_tr)
        val_acc = accuracy_score(y_val, clf.predict(X_val))
        val_top3 = top_k_accuracy_score(
            y_val, clf.predict_proba(X_val), k=3, labels=clf.classes_
        )
        report[name] = {"val_accuracy": round(val_acc, 4), "val_top3": round(val_top3, 4)}
        fitted[name] = clf
        print(f"{name:15s} val_acc={val_acc:.4f} val_top3={val_top3:.4f}")

    # random forest wins on accuracy but does not export compactly; only consider
    # the exportable models unless RF is meaningfully better (>2pt).
    exportable = {k: v for k, v in report.items() if k != "random_forest"}
    best_name = max(exportable, key=lambda k: exportable[k]["val_accuracy"])
    if report["random_forest"]["val_accuracy"] - report[best_name]["val_accuracy"] > 0.02:
        print("random_forest is >2pt better but not exportable; keeping", best_name)

    # refit winner on the full training set before export
    winner = candidates[best_name].fit(X, y)
    test_acc = accuracy_score(y_test, winner.predict(X_test))
    test_top3 = top_k_accuracy_score(
        y_test, winner.predict_proba(X_test), k=3, labels=winner.classes_
    )
    report[best_name]["test_accuracy"] = round(test_acc, 4)
    report[best_name]["test_top3"] = round(test_top3, 4)
    print(f"winner={best_name} test_acc={test_acc:.4f} test_top3={test_top3:.4f}")

    # Realistic eval: patients report partial, noisy symptoms. Drop half the
    # present symptoms and add two random ones, then re-measure.
    rng = np.random.default_rng(42)
    Xn = X_test.to_numpy().copy()
    for row in Xn:
        present = np.flatnonzero(row)
        if len(present) > 1:
            row[rng.choice(present, size=len(present) // 2, replace=False)] = 0
        absent = np.flatnonzero(row == 0)
        row[rng.choice(absent, size=2, replace=False)] = 1
    noisy_acc = accuracy_score(y_test, winner.predict(Xn))
    noisy_top3 = top_k_accuracy_score(
        y_test, winner.predict_proba(Xn), k=3, labels=winner.classes_
    )
    report[best_name]["noisy_accuracy"] = round(noisy_acc, 4)
    report[best_name]["noisy_top3"] = round(noisy_top3, 4)
    print(f"noisy-input   acc={noisy_acc:.4f} top3={noisy_top3:.4f}")

    classes = [c.strip() for c in winner.classes_]
    symptoms = list(X.columns)
    if best_name == "logreg":
        weights = {
            "coef": np.round(winner.coef_, 6).tolist(),
            "intercept": np.round(winner.intercept_, 6).tolist(),
        }
    else:  # bernoulli_nb
        weights = {
            "feature_log_prob": np.round(winner.feature_log_prob_, 6).tolist(),
            "class_log_prior": np.round(winner.class_log_prior_, 6).tolist(),
        }

    model = {
        "name": "robobrain-symptom-classifier",
        "version": 1,
        "type": best_name,
        "source": "Kaggle Disease Prediction Using Machine Learning (4920x132)",
        "symptoms": symptoms,
        "classes": classes,
        "metrics": report[best_name],
        **weights,
    }
    out = HERE / "model.json"
    out.write_text(json.dumps(model))
    (HERE / "eval_report.json").write_text(json.dumps(report, indent=2))
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
