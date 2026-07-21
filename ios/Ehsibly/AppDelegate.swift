import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    self.moduleName = "MobileApp"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]

    let launched = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    self.window.backgroundColor = launchPurple
    return launched
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  // The launch storyboard hands off to this root view before the JS bundle
  // has loaded (a visible gap in dev, waiting on Metro). Without this the
  // root view defaults to a light background, showing as a flash of the
  // wrong color between the (purple) launch screen and the JS splash
  // screen — this keeps it purple through that gap so the transition reads
  // as one continuous screen.
  override func createRootViewController() -> UIViewController {
    let viewController = super.createRootViewController()
    viewController?.view.backgroundColor = launchPurple
    return viewController ?? UIViewController()
  }

  // RCTRootView itself defaults to a white background and sits on top of
  // the view controller's view (patched above), so that patch alone still
  // let a white layer show through during the gap before JS renders. This
  // is the hook that hands us that view directly.
  override func setRootView(_ rootView: UIView, toRootViewController rootViewController: UIViewController) {
    rootView.backgroundColor = launchPurple
    super.setRootView(rootView, toRootViewController: rootViewController)
  }

  private var launchPurple: UIColor {
    UIColor(red: 0.34117647058823528, green: 0.09803921568627451, blue: 0.47843137254901963, alpha: 1)
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
