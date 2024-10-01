const core = require("@actions/core");
const axios = require("axios");

const Status = {
  IN_PROGRESS: "In_Progress",
  SUCCESS: "Success",
  FAILURE: "Failure",
};

function mapStatusToEnum(status) {
  switch (status) {
    case "In_Progress":
      return Status.IN_PROGRESS;
    case "Success":
      return Status.SUCCESS;
    case "Failure":
      return Status.FAILURE;
    default:
      core.setFailed("Unknown status: " + status);
  }
}

async function run() {
  try {
    const apiKey = core.getInput("guava_api_key");
    const checkInterval = 30;
    const baseUrl = "https://guava-backend.onrender.com";

    if (!baseUrl) {
      core.setFailed("Error: BASE_URL environment variable is not set.");
      return;
    }

    if (!apiKey) {
      core.setFailed("Error: Bad or Invalid Guava Api Key");
    }

    // Step 1: Call the endpoint to get the ID
    const createResponse = await axios.post(
      `${baseUrl}/test-suite/execution/create`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const id = createResponse.data.test_suite_execution_id;

    if (!id) {
      core.setFailed("Error: Failed to retrieve ID.");
      return;
    }

    core.info(`Received Execution ID: ${id}`);

    // Step 2: Check the status using the ID in a loop
    let status = Status.IN_PROGRESS;

    while (status === Status.IN_PROGRESS) {
      const statusResponse = await axios.get(
        `${baseUrl}/test-suite/execution/list/${id}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      status = mapStatusToEnum(statusResponse.data.status);
      core.info(`Current status: ${status}`);

      if (status === Status.SUCCESS) {
        core.setOutput("result", "success");
        return;
      } else if (status === Status.FAILURE) {
        core.setFailed("Job failed.");
        return;
      }

      core.info(
        `Waiting for ${checkInterval} seconds before checking again...`
      );
      await new Promise((resolve) => setTimeout(resolve, checkInterval * 1000));
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      core.setFailed(`Axios error: ${error.message}`);
    } else {
      core.setFailed(`Error: ${error.message}`);
    }
  }
}

run();
