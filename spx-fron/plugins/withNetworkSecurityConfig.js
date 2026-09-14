const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNetworkSecurityConfig = (config) => {
  // 1. Create res/xml/network_security_config.xml permitting all cleartext HTTP traffic
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }
      const networkSecurityConfigPath = path.join(resXmlDir, 'network_security_config.xml');
      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`;
      fs.writeFileSync(networkSecurityConfigPath, xmlContent, 'utf8');
      return config;
    },
  ]);

  // 2. Inject android:usesCleartextTraffic="true" and android:networkSecurityConfig="@xml/network_security_config" into AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    if (androidManifest.manifest && androidManifest.manifest.application && androidManifest.manifest.application[0]) {
      const mainApplication = androidManifest.manifest.application[0];
      mainApplication.$['android:usesCleartextTraffic'] = 'true';
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return config;
  });

  return config;
};

module.exports = withNetworkSecurityConfig;
