import pandas as pd


DATA_PATH = "dataset/ai4i2020.csv"


def main():
    df = pd.read_csv(DATA_PATH)

    failure_columns = [
        "TWF",
        "HDF",
        "PWF",
        "OSF",
        "RNF",
    ]

    # --------------------------------------------------
    # Failure label overlap
    # --------------------------------------------------

    df["failure_type_count"] = (
        df[failure_columns].sum(axis=1)
    )

    print("\n=== FAILURE TYPE OVERLAP ===")
    print(
        df["failure_type_count"]
        .value_counts()
        .sort_index()
    )

    print("\n=== RECORDS WITH MULTIPLE FAILURE TYPES ===")

    multiple_failures = df[
        df["failure_type_count"] > 1
    ]

    print(
        multiple_failures[
            [
                "Torque [Nm]",
                "Rotational speed [rpm]",
                "Tool wear [min]",
                "Machine failure",
                *failure_columns,
            ]
        ].head(20)
    )

    print(
        "\nNumber of records with multiple failure types:",
        len(multiple_failures),
    )

    # --------------------------------------------------
    # Torque comparison
    # --------------------------------------------------

    print("\n=== TORQUE: NORMAL VS FAILURE ===")

    print(
        df.groupby("Machine failure")[
            "Torque [Nm]"
        ].agg(
            [
                "count",
                "mean",
                "std",
                "min",
                "max",
            ]
        )
    )

    # --------------------------------------------------
    # Torque by failure type
    # --------------------------------------------------

    print("\n=== TORQUE BY FAILURE TYPE ===")

    for failure in failure_columns:
        failed_rows = df[df[failure] == 1]

        print(f"\n{failure}")

        if len(failed_rows) > 0:
            print(
                failed_rows["Torque [Nm]"].describe()
            )

    # --------------------------------------------------
    # Other feature averages
    # --------------------------------------------------

    features = [
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
    ]

    print("\n=== FEATURE MEANS: NORMAL VS FAILURE ===")

    print(
        df.groupby("Machine failure")[
            features
        ].mean()
    )

    # --------------------------------------------------
    # Failure rates by machine type
    # --------------------------------------------------

    print("\n=== FAILURE RATE BY MACHINE TYPE ===")

    print(
        df.groupby("Type")[
            "Machine failure"
        ].agg(
            [
                "count",
                "sum",
                "mean",
            ]
        )
    )


if __name__ == "__main__":
    main()