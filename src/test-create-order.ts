// Remove node-fetch import, assuming Node 18+
// import fetch from "node-fetch";

async function testCreateOrder() {
  const url = "http://localhost:3000/create-order";
  const body = {
    amount: 50000, // 500 INR
    currency: "INR",
    userId: "test_user_123",
  };

  try {
    console.log("Sending request to:", url);
    console.log("Body:", JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log("Response Status:", response.status);
    console.log("Response Body:", data);
  } catch (error) {
    console.error("Error making request:", error);
  }
}

testCreateOrder();
