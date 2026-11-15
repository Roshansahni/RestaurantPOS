import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api", async () => { const a = await vi.importActual<any>("../api"); return { ...a, api: { get: vi.fn(), post: vi.fn() } }; });
import { api } from "../api";
import { useAuth } from "../store";
import Login from "../pages/Login";

beforeEach(() => { sessionStorage.clear(); useAuth.setState({ token: null, role: null, refresh: null }); vi.clearAllMocks(); });

describe("Login", () => {
  it("stores tokens and role after a successful sign-in", async () => {
    (api.post as any).mockResolvedValue({ data: { access_token: "A", refresh_token: "R", role: "cashier" } });
    render(<Login />);
    await userEvent.type(screen.getByLabelText("Username"), "cashier1");
    await userEvent.type(screen.getByLabelText("Password"), "secret-pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(useAuth.getState().token).toBe("A"));
    expect(useAuth.getState().role).toBe("cashier");
    expect(useAuth.getState().refresh).toBe("R");
  });
  it("shows the server's error and stays signed out on failure", async () => {
    (api.post as any).mockRejectedValue({ response: { data: { detail: "Incorrect username or password" } } });
    render(<Login />);
    await userEvent.type(screen.getByLabelText("Username"), "x");
    await userEvent.type(screen.getByLabelText("Password"), "y");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Incorrect username or password");
    expect(useAuth.getState().token).toBeNull();
  });
});
