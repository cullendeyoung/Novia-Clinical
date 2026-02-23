import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import AthleticPricing from "./pages/AthleticPricing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import RegisterOrganization from "./pages/auth/RegisterOrganization";
import OrganizationPayment from "./pages/auth/OrganizationPayment";
import PaymentSuccess from "./pages/auth/PaymentSuccess";
import ForgotPassword from "./pages/auth/ForgotPassword";
import DevSetup from "./pages/DevSetup";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import OrganizationDashboardLayout from "./components/dashboard/OrganizationDashboardLayout";
import ATDashboardLayout from "./components/dashboard/ATDashboardLayout";
import AthleteDashboardLayout from "./components/dashboard/AthleteDashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import OrganizationDashboard from "./pages/dashboard/OrganizationDashboard";
import Staff from "./pages/dashboard/Staff";
import InviteStaff from "./pages/dashboard/InviteStaff";
import Teams from "./pages/dashboard/Teams";
import Athletes from "./pages/dashboard/Athletes";
import TeamManage from "./pages/dashboard/TeamManage";
import Settings from "./pages/dashboard/Settings";
import NewSession from "./pages/dashboard/NewSession";
import Patients from "./pages/dashboard/Patients";
import ErrorPage from "./pages/Error";
import Portal from "./pages/Portal";
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
        path: "/dev-setup",
        element: <DevSetup />,
      },
      {
        path: "/portal",
        element: <Portal />,
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
            path: "/register/organization/success",
            element: <PaymentSuccess />,
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
              {
                path: "teams",
                element: <Teams />,
              },
              {
                path: "teams/:teamId",
                element: <TeamManage />,
              },
              {
                path: "teams/:teamId/athletes",
                element: <Athletes />,
              },
              {
                path: "staff",
                element: <Staff />,
              },
              {
                path: "staff/invite",
                element: <InviteStaff />,
              },
              {
                path: "settings",
                element: <Settings />,
              },
            ],
          },
          {
            path: "/at",
            element: <ATDashboardLayout />,
          },
          {
            path: "/athlete",
            element: <AthleteDashboardLayout />,
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
