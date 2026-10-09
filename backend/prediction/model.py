#Note:
#This is not an actual ML yet
#It use to test pipelline

class MockPredictionModel:

    def predict(self, values: list[float]) -> dict:

        average = sum(values) / len(values)

        if average >= 70:
            label = "High"
            score = 0.82

        elif average >= 40:
            label = "Medium"
            score = 0.58

        else:
            label = "Low"
            score = 0.25

        return {
            "label": label,
            "score": score
        }


model = MockPredictionModel()