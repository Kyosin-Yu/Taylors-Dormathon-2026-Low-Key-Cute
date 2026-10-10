import os
import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATA_PATH = "dataset/ai4i2020_classification_5000.csv"

MODEL_PATH = (
    "backend/prediction/artifacts/"
    "failure_model.joblib"
)


FEATURES = [
    "Type",
    "Air temperature [K]",
    "Process temperature [K]",
    "Rotational speed [rpm]",
    "Torque [Nm]",
    "Tool wear [min]",
]

TARGET = "Machine failure"


def main():
    df = pd.read_csv(DATA_PATH)

    X = df[FEATURES]
    y = df[TARGET]

    print("\n=== DATASET ===")
    print(f"Samples: {len(df)}")
    print(f"Failures: {y.sum()}")
    print(f"Normal: {(y == 0).sum()}")

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )
    )

    categorical_features = [
        "Type",
    ]

    numeric_features = [
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "category",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                categorical_features,
            ),
            (
                "numeric",
                "passthrough",
                numeric_features,
            ),
        ]
    )

    classifier = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )

    model = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor,
            ),
            (
                "classifier",
                classifier,
            ),
        ]
    )

    print("\n=== TRAINING MODEL ===")

    model.fit(
        X_train,
        y_train,
    )

    print("Training complete.")

    predictions = model.predict(
        X_test
    )

    probabilities = model.predict_proba(
        X_test
    )[:, 1]

    print("\n=== CLASSIFICATION REPORT ===")

    print(
        classification_report(
            y_test,
            predictions,
            digits=4,
        )
    )

    print("\n=== CONFUSION MATRIX ===")

    print(
        confusion_matrix(
            y_test,
            predictions,
        )
    )

    print("\n=== ROC AUC ===")

    print(
        round(
            roc_auc_score(
                y_test,
                probabilities,
            ),
            4,
        )
    )

    print("\n=== AVERAGE PRECISION ===")

    print(
        round(
            average_precision_score(
                y_test,
                probabilities,
            ),
            4,
        )
    )

    os.makedirs(
        os.path.dirname(MODEL_PATH),
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_PATH,
    )

    print(
        f"\nModel saved to: {MODEL_PATH}"
    )


if __name__ == "__main__":
    main()