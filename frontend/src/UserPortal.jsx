import { useState } from "react";

import api from "./api";

export default function UserPortal() {

  const [file, setFile] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const uploadFile = async () => {

    try {

      if (!file) {

        alert(
          "Please select PDF"
        );

        return;
      }

      setLoading(true);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      await api.post(
        "/upload",
        formData
      );

      setMessage(
        "Claim uploaded successfully. Status: Pending Review"
      );

    } catch (err) {

      console.error(err);

      alert(
        "Upload failed"
      );

    } finally {

      setLoading(false);
    }
  };

  return (

    <div
      style={{
        padding: "40px",
        color: "white"
      }}
    >

      <h2>
        User Claim Upload
      </h2>

      <input
        type="file"
        onChange={(e) =>
          setFile(
            e.target.files[0]
          )
        }
      />

      <br />
      <br />

      <button
        onClick={uploadFile}
      >

        {
          loading
            ? "Uploading..."
            : "Upload Claim"
        }

      </button>

      {

        message && (

          <p
            style={{
              color: "#22c55e",
              marginTop: "20px"
            }}
          >

            {message}

          </p>
        )
      }

    </div>
  );
}