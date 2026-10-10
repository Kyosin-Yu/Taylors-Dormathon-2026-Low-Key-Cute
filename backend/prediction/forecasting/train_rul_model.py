import json
import os

import joblib
import numpy as np
import pandas as pd

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor

from xgboost import XGBRegressor


TRAIN_PATH = (
    "dataset/cmapss/processed/"
    "train_FD001_processed.csv"
)

TEST_PATH = (
    "dataset/cmapss/processed/"
    "test_FD001_last_cycles.csv"
)

ARTIFACT_DIR = (
    "backend/prediction/artifacts"
)

MODEL_PATH = (
    f"{ARTIFACT_DIR}/rul_model.joblib"
)

METADATA_PATH = (
    f"{ARTIFACT_DIR}/rul_model_metadata.json"
)


RUL_CAP = 125


FEATURES = [
    "time_cycles",
    "operational_setting_1",
    "operational_setting_2",

    "sensor_2",
    "sensor_3",
    "sensor_4",
    "sensor_7",
    "sensor_8",
    "sensor_9",
    "sensor_11",
    "sensor_12",
    "sensor_13",
    "sensor_14",
    "sensor_15",
    "sensor_17",
    "sensor_20",
    "sensor_21",
]


TARGET = "RUL_capped"


def calculate_metrics(
    y_true,
    y_pred,
):
    mae = mean_absolute_error(
        y_true,
        y_pred,
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_true,
            y_pred,
        )
    )

    r2 = r2_score(
        y_true,
        y_pred,
    )

    return {
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
    }


def print_metrics(
    model_name,
    metrics,
):
    print(
        f"\n=== {model_name} ==="
    )

    print(
        f"MAE:  {metrics['mae']:.4f}"
    )

    print(
        f"RMSE: {metrics['rmse']:.4f}"
    )

    print(
        f"R²:   {metrics['r2']:.4f}"
    )


def main():

    # -----------------------------------------
    # Load processed training data
    # -----------------------------------------

    df = pd.read_csv(
        TRAIN_PATH
    )

    print("\n=== DATASET ===")

    print(
        f"Rows: {len(df)}"
    )

    print(
        f"Engines: "
        f"{df['unit_number'].nunique()}"
    )

    print(
        f"Features: {len(FEATURES)}"
    )

    # -----------------------------------------
    # Split by ENGINE, not random rows
    # -----------------------------------------
    #
    # This is important.
    #
    # Rows belonging to the same engine
    # must not appear in both training and
    # validation datasets.
    # -----------------------------------------

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=0.20,
        random_state=42,
    )

    groups = df[
        "unit_number"
    ]

    train_index, val_index = next(
        splitter.split(
            df,
            groups=groups,
        )
    )

    train_df = df.iloc[
        train_index
    ].copy()

    val_df = df.iloc[
        val_index
    ].copy()

    print("\n=== ENGINE SPLIT ===")

    print(
        "Training engines:",
        train_df[
            "unit_number"
        ].nunique(),
    )

    print(
        "Validation engines:",
        val_df[
            "unit_number"
        ].nunique(),
    )

    X_train = train_df[
        FEATURES
    ]

    y_train = train_df[
        TARGET
    ]

    X_val = val_df[
        FEATURES
    ]

    y_val = val_df[
        TARGET
    ]

    # -----------------------------------------
    # Models
    # -----------------------------------------

    models = {

        "Decision Tree": (
            DecisionTreeRegressor(
                max_depth=12,
                min_samples_leaf=5,
                random_state=42,
            )
        ),

        "Random Forest": (
            RandomForestRegressor(
                n_estimators=300,
                max_depth=None,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )
        ),

        "XGBoost": (
            XGBRegressor(
                n_estimators=500,
                learning_rate=0.05,
                max_depth=6,
                subsample=0.8,
                colsample_bytree=0.8,
                objective="reg:squarederror",
                random_state=42,
                n_jobs=-1,
            )
        ),
    }

    # -----------------------------------------
    # Train and compare
    # -----------------------------------------

    results = {}

    best_model_name = None
    best_model = None
    best_rmse = float("inf")

    print(
        "\n=== MODEL COMPARISON ==="
    )

    for (
        model_name,
        model,
    ) in models.items():

        print(
            f"\nTraining {model_name}..."
        )

        model.fit(
            X_train,
            y_train,
        )

        predictions = model.predict(
            X_val
        )

        predictions = np.clip(
            predictions,
            0,
            RUL_CAP,
        )

        metrics = calculate_metrics(
            y_val,
            predictions,
        )

        results[
            model_name
        ] = metrics

        print_metrics(
            model_name,
            metrics,
        )

        if (
            metrics["rmse"]
            < best_rmse
        ):
            best_rmse = (
                metrics["rmse"]
            )

            best_model_name = (
                model_name
            )

            best_model = model

    # -----------------------------------------
    # Winner
    # -----------------------------------------

    print(
        "\n=============================="
    )

    print(
        "BEST MODEL:",
        best_model_name,
    )

    print(
        "Validation RMSE:",
        round(
            best_rmse,
            4,
        ),
    )

    print(
        "=============================="
    )

    # -----------------------------------------
    # Refit winner using ALL training data
    # -----------------------------------------

    print(
        "\nRetraining best model "
        "using all training engines..."
    )

    X_full = df[
        FEATURES
    ]

    y_full = df[
        TARGET
    ]

    best_model.fit(
        X_full,
        y_full,
    )

    # -----------------------------------------
    # Official FD001 test evaluation
    # -----------------------------------------

    test_df = pd.read_csv(
        TEST_PATH
    )

    X_test = test_df[
        FEATURES
    ]

    y_test_raw = test_df[
        "RUL"
    ]

    # Fair comparison with capped model
    y_test_capped = (
        y_test_raw.clip(
            upper=RUL_CAP
        )
    )

    test_predictions = (
        best_model.predict(
            X_test
        )
    )

    test_predictions = np.clip(
        test_predictions,
        0,
        RUL_CAP,
    )

    test_metrics = (
        calculate_metrics(
            y_test_capped,
            test_predictions,
        )
    )

    print(
        "\n=== OFFICIAL TEST RESULTS ==="
    )

    print_metrics(
        best_model_name,
        test_metrics,
    )

    # -----------------------------------------
    # Example predictions
    # -----------------------------------------

    preview = pd.DataFrame(
        {
            "unit_number":
                test_df[
                    "unit_number"
                ],

            "current_cycle":
                test_df[
                    "time_cycles"
                ],

            "actual_RUL":
                y_test_raw,

            "predicted_RUL":
                np.round(
                    test_predictions,
                    1,
                ),
        }
    )

    print(
        "\n=== SAMPLE PREDICTIONS ==="
    )

    print(
        preview.head(15)
    )

    # -----------------------------------------
    # Save best model
    # -----------------------------------------

    os.makedirs(
        ARTIFACT_DIR,
        exist_ok=True,
    )

    joblib.dump(
        best_model,
        MODEL_PATH,
        compress=3,
    )

    # -----------------------------------------
    # Save model information
    # -----------------------------------------

    metadata = {
        "model_name":
            best_model_name,

        "rul_cap":
            RUL_CAP,

        "features":
            FEATURES,

        "validation_results":
            results,

        "test_results":
            test_metrics,
    }

    with open(
        METADATA_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metadata,
            file,
            indent=4,
        )

    print(
        "\nModel saved to:"
    )

    print(
        MODEL_PATH
    )

    print(
        "\nMetadata saved to:"
    )

    print(
        METADATA_PATH
    )


if __name__ == "__main__":
    main()