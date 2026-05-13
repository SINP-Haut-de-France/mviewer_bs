import React from "react";
import * as Sentry from "@sentry/react";

const ErrorButton = ({
  label = "Tester Sentry",
  className = "btn btn-warning btn-xs",
  mode = "capture",
}) => {
  const handleClick = () => {
    const error = new Error("Sentry test error from SINP filters");

    const eventId = Sentry.captureException(error, {
      tags: {
        feature: "sinp_hdf_filters",
        source: "error_button",
      },
    });

    console.log("Sentry test event sent:", eventId);

    if (window.sinpToast?.notify) {
      window.sinpToast.notify(`Test Sentry envoye (eventId: ${eventId || "n/a"})`, {
        type: "info",
        title: "Sentry",
        duration: 3500,
      });
    }

    if (mode === "throw") {
      throw error;
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {label}
    </button>
  );
};

export default ErrorButton;
