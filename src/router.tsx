import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import AthleticPricing from "./pages/AthleticPricing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RegisterOrganization from "./pages/auth/RegisterOrganization";
import OrganizationPayment from "./pages/auth/OrganizationPayment";
import ForgotPassword from "./pages/auth/ForgotPassword";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import OrganizationDashboardLayout from "./components/dashboard/OrganizationDashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import OrganizationDashboard from "./pages/dashboard/OrganizationDashboard";
import NewSession from "./pages/dashboard/NewSession";
import Patients from "./pages/dashboard/Patients";
import ErrorPage from "./pages/Error";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import AuthRouter from "./components/auth/AuthRouter";

export const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/pricing",
        element: <Pricing />,
      },
      {
        path: "/athletic",
        element: <AthleticPricing />,
      },
      {
        element: <GuestRoute />,
        children: [
          {
            path: "/login",
            element: <Login />,
          },
          {
            path: "/register",
            element: <Register />,
          },
          {
            path: "/register/organization",
            element: <RegisterOrganization />,
          },
          {
            path: "/register/organization/payment",
            element: <OrganizationPayment />,
          },
          {
            path: "/forgot-password",
            element: <ForgotPassword />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/auth-router",
            element: <AuthRouter />,
          },
          {
            path: "/dashboard",
            element: <DashboardLayout />,
            children: [
              {
                index: true,
                element: <Dashboard />,
              },
              {
                path: "new-session",
                element: <NewSession />,
              },
              {
                path: "patients",
                element: <Patients />,
              },
            ],
          },
          {
            path: "/org",
            element: <OrganizationDashboardLayout />,
            children: [
              {
                index: true,
                element: <OrganizationDashboard />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

export type AppRoute = (typeof router)["routes"][number];
