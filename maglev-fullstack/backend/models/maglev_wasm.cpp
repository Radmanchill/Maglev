#include <cmath>

// ================= PARAMETERS =================
struct Params {
    double m  = 0.05;
    double g  = 9.81;
    double k  = 2e-5;
    double c  = 8.0;
    double y0 = 0.002;

    double R  = 2.0;
    double L  = 0.02;

    double y_min = 0.005;
    double y_max = 0.05;
    double i_max = 25.0;
};

struct State {
    double y;
    double v;
    double i;
};

static Params p;

// ================= EQUILIBRIUM =================
extern "C" {

double equilibrium_current(double y) {
    double gap = y + p.y0;
    return std::sqrt((p.m * p.g * gap * gap) / p.k);
}

double equilibrium_voltage(double y) {
    return p.R * equilibrium_current(y);
}

// ================= STEP FUNCTION =================
State step(State x, double u, double dt) {
    double gap = x.y + p.y0;

    double Fm = p.k * x.i * x.i / (gap * gap);

    double dy = x.v;
    double dv = (Fm - p.m * p.g - p.c * x.v) / p.m;
    double di = (u - p.R * x.i) / p.L;

    State xn;
    xn.y = x.y + dt * dy;
    xn.v = x.v + dt * dv;
    xn.i = x.i + dt * di;

    if (xn.y < p.y_min) xn.y = p.y_min;
    if (xn.y > p.y_max) xn.y = p.y_max;
    if (xn.i < 0.0)     xn.i = 0.0;
    if (xn.i > p.i_max) xn.i = p.i_max;

    return xn;
}

}
