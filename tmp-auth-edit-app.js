const fs = require('fs');

const path = 'spx-fron/App.js';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
  "import { useLikedSongs } from './hooks/useLikedSongs';",
  "import { useLikedSongs } from './hooks/useLikedSongs';\nimport { useAuth } from './hooks/useAuth';"
);

text = text.replace(
  "import { SettingsModal, CreatePlaylistModal, AddToPlaylistModal } from './components/Modals';",
  "import { SettingsModal, CreatePlaylistModal, AddToPlaylistModal } from './components/Modals';\nimport { AuthScreen } from './components/AuthScreen';"
);

text = text.replace(
  "  const { width: liveWidth, height: liveHeight } = useWindowDimensions();",
  "  const initialBackendUrl = getDefaultBackendUrl();\n  const auth = useAuth(initialBackendUrl);\n  const { width: liveWidth, height: liveHeight } = useWindowDimensions();"
);

text = text.replace(
  "} = useSongs(getDefaultBackendUrl());",
  "} = useSongs(initialBackendUrl, auth.authenticatedFetch);"
);

text = text.replace(
  "} = usePlaylists(backendUrl);",
  "} = usePlaylists(backendUrl, auth.authenticatedFetch);"
);

text = text.replace(
  /const \{\s+likedSongs,\s+toggleLikeSong,\s+isSongLiked\s+\} = useLikedSongs\(\);/,
  "const {\n    likedSongs,\n    fetchLikedSongs,\n    toggleLikeSong,\n    isSongLiked\n  } = useLikedSongs(backendUrl, auth.authenticatedFetch, auth.isAuthenticated);"
);

text = text.replace(
  /  useEffect\(\(\) => \{\s+\/\/ Only auto-fetch on mount if we already have a configured URL\s+const initialUrl = getDefaultBackendUrl\(\);\s+if \(initialUrl\) \{\s+fetchSongs\(initialUrl\);\s+fetchPlaylists\(initialUrl\);\s+\}\s+\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\s+\}, \[\]\); \/\/ Run once on mount only/,
  "  useEffect(() => {\n    auth.setBackendUrlRef(backendUrl);\n  }, [auth, backendUrl]);\n\n  useEffect(() => {\n    if (auth.isAuthenticated && backendUrl) {\n      fetchSongs(backendUrl);\n      fetchPlaylists(backendUrl);\n      fetchLikedSongs(backendUrl);\n    }\n  }, [auth.isAuthenticated, backendUrl, fetchSongs, fetchPlaylists, fetchLikedSongs]);"
);

text = text.replace(
  "      fetchSongs(tempUrl.trim());\n      fetchPlaylists(tempUrl.trim());",
  "      auth.setBackendUrlRef(tempUrl.trim());\n      if (auth.isAuthenticated) {\n        fetchSongs(tempUrl.trim());\n        fetchPlaylists(tempUrl.trim());\n        fetchLikedSongs(tempUrl.trim());\n      }"
);

text = text.replace(
  "            fieldName: 'song',\n            httpMethod: 'POST',",
  "            fieldName: 'song',\n            httpMethod: 'POST',\n            headers: {\n              Authorization: `Bearer ${auth.accessToken}`,\n            },"
);

text = text.replace(
  "        const response = await fetch(`${safeBaseUrl}/upload`, {\n          method: 'POST',\n          body: formData,\n        });",
  "        const response = await auth.authenticatedFetch(`${safeBaseUrl}/upload`, {\n          method: 'POST',\n          body: formData,\n        });"
);

const authGate = `  if (auth.authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Restoring session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthScreen
        mode={auth.authMode}
        error={auth.authError}
        loading={auth.authLoading}
        backendUrl={backendUrl}
        onModeChange={auth.setAuthMode}
        onLogin={auth.login}
        onRegister={auth.register}
      />
    );
  }

`;

text = text.replace("  if (view === 'player') {", `${authGate}  if (view === 'player') {`);

text = text.replace(
  '<Text style={styles.greeting}>Hello <Text style={styles.bold}>Santhosh</Text></Text>',
  "<Text style={styles.greeting}>Hello <Text style={styles.bold}>{auth.user?.username || 'Santhosh'}</Text></Text>"
);

text = text.replace(
  "              <View style={styles.uploadRow}>",
  "              {auth.user?.role === 'admin' && (\n              <View style={styles.uploadRow}>"
);

text = text.replace(
  "              </View>\n\n              <Text style={styles.sectionTitle}>Popular Playlist</Text>",
  "              </View>\n              )}\n\n              <Text style={styles.sectionTitle}>Popular Playlist</Text>"
);

text = text.replace(
  "          defaultUrl={getDefaultBackendUrl()}\n        />",
  "          defaultUrl={getDefaultBackendUrl()}\n          currentUser={auth.user}\n          onLogout={auth.logout}\n        />"
);

fs.writeFileSync(path, text);
