import type { GarminConnect } from "@gooin/garmin-connect"
import JSZip from "jszip"

/**
 * O endpoint de "atividade original" do Garmin sempre retorna um .zip
 * (nunca o .fit puro), tipicamente com um único arquivo dentro. Baixamos em
 * memória (bypassando o método da lib que só grava em disco — não faz
 * sentido em serverless) e extraímos o primeiro .fit encontrado.
 */
export async function downloadOriginalFit(
  client: GarminConnect,
  activityId: number
): Promise<Buffer> {
  const zipBuffer = await client.client.get<Buffer>(
    client.url.DOWNLOAD_ZIP + activityId,
    { responseType: "arraybuffer" }
  )

  const zip = await JSZip.loadAsync(zipBuffer)
  const fitEntry = Object.values(zip.files).find(
    (file) => !file.dir && file.name.toLowerCase().endsWith(".fit")
  )

  if (!fitEntry) {
    throw new Error(
      `Nenhum arquivo .fit encontrado no zip da atividade ${activityId}.`
    )
  }

  return fitEntry.async("nodebuffer")
}
