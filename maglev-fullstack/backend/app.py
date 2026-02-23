from fastapi import FastAPI
from pydantic import BaseModel
from simulation.simulate import simulate_pid


app = FastAPI()


class SimRequest(BaseModel):
    controller: str = "pid"
    setpoint: float = 0.02


@app.post("/simulate")
def run_simulation(req: SimRequest):
    if req.controller == "pid":
        return simulate_pid(setpoint=req.setpoint)
    else:
        return {"error": "Controller not implemented"}
