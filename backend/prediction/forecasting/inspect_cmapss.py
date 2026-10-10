import pandas as pd


TRAIN_PATH = "dataset/cmapss/train_FD001.txt"
TEST_PATH = "dataset/cmapss/test_FD001.txt"
RUL_PATH = "dataset/cmapss/RUL_FD001.txt"


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


def load_data(path):
    return pd.read_csv(
        path,
        sep=r"\s+",
        header=None,
        names=COLUMN_NAMES,
    )


def main():
    train_df = load_data(TRAIN_PATH)
    test_df = load_data(TEST_PATH)

    rul_df = pd.read_csv(
        RUL_PATH,
        sep=r"\s+",
        header=None,
        names=["RUL"],
    )

    print("\n=== TRAIN SHAPE ===")
    print(train_df.shape)

    print("\n=== TEST SHAPE ===")
    print(test_df.shape)

    print("\n=== RUL SHAPE ===")
    print(rul_df.shape)

    print("\n=== TRAIN HEAD ===")
    print(train_df.head())

    print("\n=== TEST HEAD ===")
    print(test_df.head())

    print("\n=== RUL HEAD ===")
    print(rul_df.head())

    print("\n=== NUMBER OF TRAIN ENGINES ===")
    print(train_df["unit_number"].nunique())

    print("\n=== NUMBER OF TEST ENGINES ===")
    print(test_df["unit_number"].nunique())

    print("\n=== TRAIN CYCLE RANGE ===")
    print(
        train_df.groupby("unit_number")["time_cycles"]
        .max()
        .describe()
    )

    print("\n=== TEST CYCLE RANGE ===")
    print(
        test_df.groupby("unit_number")["time_cycles"]
        .max()
        .describe()
    )

    print("\n=== MISSING VALUES ===")
    print(train_df.isnull().sum())

    print("\n=== SENSOR SUMMARY ===")

    sensor_columns = [
        column
        for column in train_df.columns
        if column.startswith("sensor_")
    ]

    print(
        train_df[sensor_columns]
        .describe()
        .T[
            [
                "mean",
                "std",
                "min",
                "max",
            ]
        ]
    )


if __name__ == "__main__":
    main()