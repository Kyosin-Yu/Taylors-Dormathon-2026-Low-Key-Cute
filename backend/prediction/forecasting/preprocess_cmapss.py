import os
import pandas as pd


TRAIN_PATH = "dataset/cmapss/train_FD001.txt"
TEST_PATH = "dataset/cmapss/test_FD001.txt"
RUL_PATH = "dataset/cmapss/RUL_FD001.txt"

OUTPUT_DIR = "dataset/cmapss/processed"

TRAIN_OUTPUT = (
    f"{OUTPUT_DIR}/train_FD001_processed.csv"
)

TEST_OUTPUT = (
    f"{OUTPUT_DIR}/test_FD001_processed.csv"
)


COLUMN_NAMES = [
    "unit_number",
    "time_cycles",
    "operational_setting_1",
    "operational_setting_2",
    "operational_setting_3",
    "sensor_1",
    "sensor_2",
    "sensor_3",
    "sensor_4",
    "sensor_5",
    "sensor_6",
    "sensor_7",
    "sensor_8",
    "sensor_9",
    "sensor_10",
    "sensor_11",
    "sensor_12",
    "sensor_13",
    "sensor_14",
    "sensor_15",
    "sensor_16",
    "sensor_17",
    "sensor_18",
    "sensor_19",
    "sensor_20",
    "sensor_21",
]


USEFUL_SENSORS = [
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


def load_data(path):
    return pd.read_csv(
        path,
        sep=r"\s+",
        header=None,
        names=COLUMN_NAMES,
    )


def main():
    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True,
    )

    # -----------------------------------------
    # Load datasets
    # -----------------------------------------

    train_df = load_data(TRAIN_PATH)
    test_df = load_data(TEST_PATH)

    rul_df = pd.read_csv(
        RUL_PATH,
        sep=r"\s+",
        header=None,
        names=["final_rul"],
    )

    # -----------------------------------------
    # Create training RUL
    # -----------------------------------------

    max_cycles = (
        train_df
        .groupby("unit_number")["time_cycles"]
        .max()
        .rename("max_cycle")
    )

    train_df = train_df.merge(
        max_cycles,
        on="unit_number",
    )

    train_df["RUL"] = (
        train_df["max_cycle"]
        - train_df["time_cycles"]
    )

    # -----------------------------------------
    # Optional capped RUL
    # -----------------------------------------
    #
    # Early in an engine's life, exact RUL is
    # difficult to distinguish.
    #
    # Capping prevents extremely large early
    # RUL values dominating training.
    #

    RUL_CAP = 125

    train_df["RUL_capped"] = (
        train_df["RUL"]
        .clip(upper=RUL_CAP)
    )

    # -----------------------------------------
    # Keep useful columns
    # -----------------------------------------

    train_columns = [
        "unit_number",
        "time_cycles",
        "operational_setting_1",
        "operational_setting_2",
        *USEFUL_SENSORS,
        "RUL",
        "RUL_capped",
    ]

    train_processed = (
        train_df[train_columns]
        .copy()
    )

    # -----------------------------------------
    # Prepare test dataset
    # -----------------------------------------

    test_columns = [
        "unit_number",
        "time_cycles",
        "operational_setting_1",
        "operational_setting_2",
        *USEFUL_SENSORS,
    ]

    test_processed = (
        test_df[test_columns]
        .copy()
    )

    # -----------------------------------------
    # Add real RUL to LAST test cycle
    # -----------------------------------------

    last_cycles = (
        test_processed
        .groupby("unit_number")
        .tail(1)
        .copy()
    )

    last_cycles = (
        last_cycles
        .sort_values("unit_number")
        .reset_index(drop=True)
    )

    last_cycles["RUL"] = (
        rul_df["final_rul"].values
    )

    # -----------------------------------------
    # Save
    # -----------------------------------------

    train_processed.to_csv(
        TRAIN_OUTPUT,
        index=False,
    )

    test_processed.to_csv(
        TEST_OUTPUT,
        index=False,
    )

    last_cycles.to_csv(
        f"{OUTPUT_DIR}/test_FD001_last_cycles.csv",
        index=False,
    )

    # -----------------------------------------
    # Summary
    # -----------------------------------------

    print("\n=== TRAIN PROCESSED ===")
    print(train_processed.shape)

    print("\n=== TEST PROCESSED ===")
    print(test_processed.shape)

    print("\n=== LAST TEST CYCLES ===")
    print(last_cycles.shape)

    print("\n=== TRAIN SAMPLE ===")
    print(
        train_processed[
            [
                "unit_number",
                "time_cycles",
                "RUL",
                "RUL_capped",
            ]
        ].head(10)
    )

    print("\n=== RUL SUMMARY ===")
    print(
        train_processed[
            [
                "RUL",
                "RUL_capped",
            ]
        ].describe()
    )

    print("\n=== LAST TEST ENGINE RUL ===")
    print(
        last_cycles[
            [
                "unit_number",
                "time_cycles",
                "RUL",
            ]
        ].head(10)
    )

    print(
        "\nProcessed files saved in:",
        OUTPUT_DIR,
    )


if __name__ == "__main__":
    main()