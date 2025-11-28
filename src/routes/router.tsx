import AppLayout from "@/components/layouts/AppLayout";
import FocusLayout from "@/components/layouts/FocusLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RequireAuth from "@/pages/auth/RequireAuth";
import DoPage from "@/pages/do/DoPage";
import FocusPage from "@/pages/focus/FocusPage";
import PlanPage from "@/pages/plan/PlanPage";
import SettingPage from "@/pages/setting/SettingPage";
import { createBrowserRouter, Navigate } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  // NOTE: 本番では RequireAuth でラップするが、検証中はコメントアウトして全ページを直接確認できるようにする
  // {
  //   element: <RequireAuth />,
  //   children: [
  //     {
  //       element: <AppLayout />,
  //       children: [
  //         { path: "/", element: <DoPage /> },
  //         { path: "/plan", element: <PlanPage /> },
  //         { path: "/setting", element: <SettingPage /> },
  //       ],
  //     },
  //     {
  //       element: <FocusLayout />,
  //       children: [{ path: "/focus", element: <FocusPage /> }],
  //     },
  //   ],
  // },
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
