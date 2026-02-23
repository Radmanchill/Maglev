import numpy as np
from models.maglev import maglev_dynamics
from controllers.pid import PIDController



def simulate_pid(setpoint=0.02, T=2.0, dt=0.001):
    params = {
        "m": 0.05,
        "g": 9.81,
        "k": 2e-5,
        "y_min": 0.005,
    }

    time = np.arange(0, T, dt)
    x = np.zeros((2, len(time)))
    u_hist = np.zeros(len(time))

    # initial state
    x[:, 0] = [0.03, 0.0]

    pid = PIDController(kp=800, ki=0, kd=20)

    for k in range(len(time) - 1):
        y = x[0, k]
        error = setpoint - y

        u = pid.compute(error, dt)
        u_hist[k] = u

        dx = maglev_dynamics(x[:, k], u, params)
        x[:, k + 1] = x[:, k] + dt * dx

        # position clamp
        x[0, k + 1] = max(params["y_min"], x[0, k + 1])

    return {
        "time": time.tolist(),
        "position": x[0, :].tolist(),
        "velocity": x[1, :].tolist(),
        "current": u_hist.tolist(),
    }
