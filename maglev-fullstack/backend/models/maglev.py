import numpy as np

def maglev_dynamics(x, u, params):
    """
    Nonlinear MAGLEV dynamics
    x[0] = position (m)
    x[1] = velocity (m/s)
    u    = current (A)
    """
    y, yd = x
    m = params["m"]
    g = params["g"]
    k = params["k"]
    y_min = params["y_min"]

    y = max(y, y_min)

    ydd = g - (k / m) * (u**2 / y**2)
    return np.array([yd, ydd])
