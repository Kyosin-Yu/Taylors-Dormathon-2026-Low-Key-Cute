#Note:
#This purpose is to make model switching easier.
#If tomorrow domain is about forecasting , switch:
#PREDICTION_MODE = "forecasting"

PREDICTION_MODE = "mock"

SUPPORTED_MODES = [
    "mock",
    "forecasting",
    "text",
    "tabular",
]