import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const AGP_VERSION = "8.6.0";
const VARIABLES = `ext {
    minSdkVersion = 24
    // AGP 8.6.0 is tested up to compileSdk 35; androidx.browser 1.9+ needs AGP 8.9.1+
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.9.3'
    androidxAppCompatVersion = '1.7.0'
    androidxBrowserVersion = '1.8.0'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.5'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.3.0'
    androidxEspressoCoreVersion = '3.7.0'
    cordovaAndroidVersion = '14.0.1'
}
`;

const agpFiles = [
  "android/build.gradle",
  "android/capacitor-cordova-android-plugins/build.gradle",
  "node_modules/@capacitor/android/capacitor/build.gradle",
];

for (const file of agpFiles) {
  const path = resolve(file);
  if (!existsSync(path)) continue;

  let source = readFileSync(path, "utf8");
  const next = source.replace(
    /com\.android\.tools\.build:gradle:8\.\d+\.\d+/g,
    `com.android.tools.build:gradle:${AGP_VERSION}`,
  );
  if (next !== source) {
    writeFileSync(path, next);
    console.log(`Patched AGP to ${AGP_VERSION} in ${file}`);
    source = next;
  }

  if (file.includes("@capacitor/android")) {
    const javaNext = source.replaceAll("JavaVersion.VERSION_21", "JavaVersion.VERSION_17");
    if (javaNext !== source) {
      writeFileSync(path, javaNext);
      console.log(`Patched Java 17 in ${file}`);
    }
  }
}

const variablesPath = resolve("android/variables.gradle");
if (existsSync(variablesPath)) {
  writeFileSync(variablesPath, VARIABLES);
  console.log("Applied AGP 8.6-compatible AndroidX versions in android/variables.gradle");
}
