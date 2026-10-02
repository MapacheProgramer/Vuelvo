const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error(
    "Falta VITE_SUPABASE_URL en el archivo .env",
  );
}

export async function callEdgeFunction(
  functionName,
  {
    method = "POST",
    body,
    headers = {},
  } = {},
) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${functionName}`,
    {
      method,

      headers: {
        "Content-Type": "application/json",
        ...headers,
      },

      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    },
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Error HTTP ${response.status}`,
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}