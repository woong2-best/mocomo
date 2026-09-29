/**
 * WebRTCModule constructs PeerConnectionFactory and an audio device in its
 * constructor. React Native calls that constructor at process start, so a
 * failure there kills the app before any screen. Move the heavy init to the
 * first real WebRTC call.
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "../node_modules/@livekit/react-native-webrtc/android/src/main/java/com/oney/WebRTCModule/WebRTCModule.java"
);

const MARK = "ensurePeerConnectionFactory";

function main() {
  if (!fs.existsSync(file)) {
    console.warn("patch-webrtc-lazy: WebRTCModule.java missing, skip");
    return;
  }
  const source = fs.readFileSync(file, "utf8");
  if (source.includes(MARK)) {
    if (source.includes("builder(reactContext)") || source.includes("GetUserMediaImpl(this, reactContext)")) {
      const fixed = source
        .replace(
          "PeerConnectionFactory.InitializationOptions.builder(reactContext)",
          "PeerConnectionFactory.InitializationOptions.builder(getReactApplicationContext())"
        )
        .replace(
          "JavaAudioDeviceModule.builder(reactContext)",
          "JavaAudioDeviceModule.builder(getReactApplicationContext())"
        )
        .replace(
          "new GetUserMediaImpl(this, reactContext)",
          "new GetUserMediaImpl(this, getReactApplicationContext())"
        );
      fs.writeFileSync(file, fixed);
      console.log("patch-webrtc-lazy: fixed reactContext in deferred init");
      return;
    }
    console.log("patch-webrtc-lazy: already applied");
    return;
  }

  let next = source.replace(
    "    private final GetUserMediaImpl getUserMediaImpl;\n",
    "    private GetUserMediaImpl getUserMediaImpl;\n    private boolean mFactoryReady;\n"
  );

  const ctorStart = next.indexOf("    public WebRTCModule(ReactApplicationContext reactContext) {");
  const getName = next.indexOf("    @NonNull\n    @Override\n    public String getName() {", ctorStart);
  if (ctorStart < 0 || getName < 0) {
    throw new Error("patch-webrtc-lazy: constructor anchors not found");
  }

  const heavy = next.slice(ctorStart, getName);
  const bodyStart = heavy.indexOf("        WebRTCModuleOptions options");
  const bodyEnd = heavy.lastIndexOf("        getUserMediaImpl = new GetUserMediaImpl(this, reactContext);\n    }\n");
  if (bodyStart < 0 || bodyEnd < 0) {
    throw new Error("patch-webrtc-lazy: constructor body anchors not found");
  }
  const heavyBody = heavy
    .slice(bodyStart, bodyEnd + "        getUserMediaImpl = new GetUserMediaImpl(this, reactContext);\n".length)
    .replaceAll("reactContext", "getReactApplicationContext()");

  const replacement = `    private synchronized void ensurePeerConnectionFactory() {
        if (mFactoryReady) {
            return;
        }
${heavyBody}        mFactoryReady = true;
    }

    private synchronized PeerConnectionFactory peerFactory() {
        ensurePeerConnectionFactory();
        return mFactory;
    }

    private synchronized GetUserMediaImpl userMedia() {
        ensurePeerConnectionFactory();
        return getUserMediaImpl;
    }

    public WebRTCModule(ReactApplicationContext reactContext) {
        super(reactContext);

        mPeerConnectionObservers = new SparseArray<>();
        localStreams = new HashMap<>();
    }

`;

  next = next.slice(0, ctorStart) + replacement + next.slice(getName);
  next = next.replaceAll("mFactory.", "peerFactory().");
  next = next.replaceAll("getUserMediaImpl.", "userMedia().");

  if (!next.includes(MARK) || next.includes("peerFactory().=")) {
    throw new Error("patch-webrtc-lazy: rewrite failed");
  }
  fs.writeFileSync(file, next);
  console.log("patch-webrtc-lazy: deferred PeerConnectionFactory init");
}

main();
