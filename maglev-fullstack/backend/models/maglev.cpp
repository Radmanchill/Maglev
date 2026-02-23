#include <cmath>
#include <algorithm>
#include <cstdlib>

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
    double u_max = 50.0;
};

static Params params;

// ================= NMPC WEIGHTS =================
static double Qy = 200.0;
static double Ru = 0.01;

// ================= STATE =================
struct State {
    double y;
    double v;
    double i;
};

static State state;
static double y_ref = 0.02;

// ================= UTIL =================
double clamp(double x, double a, double b) {
    return std::max(a, std::min(b, x));
}

// ================= EQUILIBRIUM =================
double equilibrium_current(double y) {
    double gap = y + params.y0;
    return std::sqrt((params.m * params.g * gap * gap) / params.k);
}

double equilibrium_voltage(double y) {
    return params.R * equilibrium_current(y);
}

// ================= PLANT =================
State maglev_step(const State& x, double u, double dt) {
    double gap = x.y + params.y0;
    double Fm = params.k * x.i * x.i / (gap * gap);

    State xn;
    xn.y = x.y + dt * x.v;
    xn.v = x.v + dt * ((Fm - params.m * params.g - params.c * x.v) / params.m);
    xn.i = x.i + dt * ((u - params.R * x.i) / params.L);

    xn.y = clamp(xn.y, params.y_min, params.y_max);
    xn.i = clamp(xn.i, 0.0, params.i_max);

    return xn;
}

// ================= PID =================
struct PID {
    double Kp = 0.0, Ki = 0.0, Kd = 0.0;
    double integral = 0.0, prev_error = 0.0;

    double update(double e, double dt) {
        integral += e * dt;
        double d = (e - prev_error) / dt;
        prev_error = e;
        return Kp * e + Ki * integral + Kd * d;
    }

    void reset() {
        integral = 0.0;
        prev_error = 0.0;
    }
};

static PID pid;

// ================= LQR =================
static double K_lqr[3] = {120.0, 18.0, 0.8};

// ================= NMPC =================
static constexpr int N = 12;
static double U_seq[N] = {0};

// ================= CONTROLLER ENUM =================
enum ControllerType {
    PID_CTRL = 0,
    FL_PID_CTRL = 1,
    LQR_CTRL = 2,
    NMPC_CTRL = 3
};

static ControllerType controller = PID_CTRL;

// ================= CONTROL LAWS =================
double control_pid(double dt) {
    double e = y_ref - state.y;
    return clamp(pid.update(e, dt), 0.0, params.u_max);
}

double control_fl_pid(double dt) {
    double e = y_ref - state.y;
    double v_des = pid.update(e, dt);

    double gap = state.y + params.y0;
    double term =
        (params.m * gap * gap / params.k) *
        (v_des + params.g + params.c * state.v / params.m);

    double i_des = std::sqrt(std::max(term, 0.0));
    i_des = clamp(i_des, 0.0, params.i_max);

    double u =
        params.R * i_des +
        params.L * (i_des - state.i) / dt;

    return clamp(u, 0.0, params.u_max);
}

double control_lqr() {
    double i_eq = equilibrium_current(y_ref);
    double u_eq = equilibrium_voltage(y_ref);

    double x1 = state.y - y_ref;
    double x2 = state.v;
    double x3 = state.i - i_eq;

    double u =
        u_eq -
        (K_lqr[0] * x1 +
         K_lqr[1] * x2 +
         K_lqr[2] * x3);

    return clamp(u, 0.0, params.u_max);
}

double nmpc_cost(const double* U, double dt) {
    State x = state;
    double J = 0.0;

    for (int k = 0; k < N; k++) {
        x = maglev_step(x, U[k], dt);
        double e = x.y - y_ref;
        J += Qy * e * e + Ru * U[k] * U[k];
    }
    return J;
}

double control_nmpc(double dt) {
    double U[N];
    for (int k = 0; k < N; k++) U[k] = U_seq[k];

    for (int iter = 0; iter < 20; iter++) {
        for (int k = 0; k < N; k++) {
            double old = U[k];
            double du = ((rand() % 200) / 100.0 - 1.0);
            U[k] = clamp(old + du, 0.0, params.u_max);

            if (nmpc_cost(U, dt) > nmpc_cost(U_seq, dt))
                U[k] = old;
        }
    }

    double u = U[0];
    for (int k = 0; k < N - 1; k++)
        U_seq[k] = U[k + 1];
    U_seq[N - 1] = u;

    return u;
}

// ================= EXPORTED API =================
extern "C" {

void init(double y0) {
    static bool seeded = false;
    if (!seeded) {
        srand(1); // deterministic NMPC
        seeded = true;
    }

    y_ref = clamp(y0, params.y_min, params.y_max);
    double i_eq = equilibrium_current(y_ref);
    state = { y_ref, 0.0, i_eq };
    pid.reset();
}

void set_setpoint(double y) {
    y_ref = clamp(y, params.y_min, params.y_max);
    pid.reset();
}

void set_pid_gains(double Kp, double Ki, double Kd) {
    pid.Kp = Kp;
    pid.Ki = Ki;
    pid.Kd = Kd;
    pid.reset();
}

void set_lqr_gains(double k1, double k2, double k3) {
    K_lqr[0] = k1;
    K_lqr[1] = k2;
    K_lqr[2] = k3;
}

void set_nmpc_weights(double qy, double ru) {
    Qy = qy;
    Ru = ru;
}

void set_controller(int type) {
    controller = static_cast<ControllerType>(type);
    pid.reset();

    if (controller == NMPC_CTRL) {
        for (int k = 0; k < N; k++)
            U_seq[k] = 0.0;
    }
}

void step_closed_loop(double dt) {
    double u = 0.0;

    switch (controller) {
        case PID_CTRL:    u = control_pid(dt);    break;
        case FL_PID_CTRL: u = control_fl_pid(dt); break;
        case LQR_CTRL:    u = control_lqr();      break;
        case NMPC_CTRL:   u = control_nmpc(dt);   break;
    }

    state = maglev_step(state, u, dt);
}

double get_y() { return state.y; }
double get_v() { return state.v; }
double get_i() { return state.i; }

}
