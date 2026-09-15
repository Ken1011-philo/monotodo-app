import AppLayout from "@/components/layouts/AppLayout";
import FocusLayout from "@/components/layouts/FocusLayout";
import DoPage from "@/pages/do/DoPage";
import FocusPage from "@/pages/focus/FocusPage";
import PlanPage from "@/pages/plan/PlanPage";
import SettingPage from "@/pages/setting/SettingPage";
import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <DoPage /> },
      { path: "/plan", element: <PlanPage /> },
      { path: "/setting", element: <SettingPage /> },
    ],
  },
  {
    element: <FocusLayout />,
    children: [{ path: "/focus", element: <FocusPage /> }],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default router;
