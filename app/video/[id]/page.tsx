import { notFound } from "next/navigation";
import { getPendingVideoById, getVideoByPendingId } from "@/app/api/db";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideoByPendingId(id);

  if (video?.videoUrl) {
    return {
      title: "Remix Me - Video",
      openGraph: {
        title: "Check out this AI-generated video!",
        type: "video.other",
        videos: [{ url: video.videoUrl }],
      },
    };
  }

  return { title: "Remix Me - Video" };
}

function ipfsToGateway(ipfsUri: string): string {
  const cid = ipfsUri.replace("ipfs://", "");
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export default async function VideoPage({ params }: Props) {
  const { id } = await params;

  const video = await getVideoByPendingId(id);
  if (video) {
    const src = video.videoUrl || ipfsToGateway(video.videoIpfs);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-slate-800">
          <video
            src={src}
            controls
            autoPlay
            loop
            playsInline
            className="w-full aspect-video bg-black"
          />
          <div className="p-5">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              AI Generated Video
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Created with{" "}
              <a
                href="https://www.x402.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                x402
              </a>{" "}
              + Remix Me
            </p>
          </div>
        </div>
      </main>
    );
  }

  const pending = await getPendingVideoById(id);
  if (!pending) {
    notFound();
  }

  if (pending.status === "failed") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="w-full max-w-md text-center rounded-2xl shadow-xl bg-white dark:bg-slate-800 p-8">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Video Generation Failed
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {pending.errorMessage || "An unexpected error occurred during generation."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md text-center rounded-2xl shadow-xl bg-white dark:bg-slate-800 p-8">
        <div className="mb-6">
          <div className="mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Your video is being generated...
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This usually takes 1-2 minutes. The page will refresh automatically.
        </p>
      </div>
      <RefreshScript />
    </main>
  );
}

function RefreshScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `setTimeout(function(){window.location.reload()},10000);`,
      }}
    />
  );
}
