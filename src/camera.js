export async function startCamera(video, onStatusChange) {
  const constraints = {
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  onStatusChange?.('Requesting permission');
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await video.play();
  onStatusChange?.('Camera live');
  return stream;
}

export function stopCamera(stream, video) {
  stream?.getTracks().forEach((track) => track.stop());
  if (video) {
    video.srcObject = null;
  }
}
