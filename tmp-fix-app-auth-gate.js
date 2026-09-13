const fs = require('fs');

const path = 'spx-fron/App.js';
let text = fs.readFileSync(path, 'utf8');

const bad = `      if (auth.authLoading) {
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

  if (view === 'player') { setView('home'); return true; }`;

text = text.replace(bad, "      if (view === 'player') { setView('home'); return true; }");

const gate = `  if (auth.authLoading) {
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

text = text.replace("  if (view === 'player') {\n    return (", `${gate}  if (view === 'player') {\n    return (`);

fs.writeFileSync(path, text);
