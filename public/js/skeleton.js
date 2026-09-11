// skeleton.js - Page loading skeleton effect
(function () {
    // Don't run if the script is already processing or if we're in an iframe
    if (window.skeletonLoadingActive) return;
    window.skeletonLoadingActive = true;

    // Create a unique ID for this skeleton instance
    const skeletonId = 'skeleton-loader-' + Math.random().toString(36).substr(2, 9);

    // Store the original script element to remove it later
    const originalScript = document.currentScript;

    // Create a style element for skeleton animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes skeleton-pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
        
        .skeleton-block {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
        }
        
        @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;
    document.head.appendChild(style);

    // Create the skeleton overlay container
    const skeletonContainer = document.createElement('div');
    skeletonContainer.id = skeletonId;
    skeletonContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 999999;
        overflow-y: auto;
        transition: opacity 0.5s ease-in-out;
    `;

    // Create a basic skeleton structure that mimics a typical page layout
    skeletonContainer.innerHTML = `
        <div style="padding: 20px; max-width: 1400px; margin: 0 auto;">
            <!-- Header skeleton -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 10px 0;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="skeleton-block" style="width: 30px; height: 30px;"></div>
                    <div class="skeleton-block" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                    <div class="skeleton-block" style="width: 100px; height: 30px;"></div>
                </div>
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div class="skeleton-block" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                    <div class="skeleton-block" style="width: 80px; height: 40px;"></div>
                </div>
            </div>

            <!-- Welcome header skeleton -->
            <div style="margin-bottom: 28px;">
                <div class="skeleton-block" style="width: 300px; height: 40px; margin-bottom: 10px;"></div>
                <div class="skeleton-block" style="width: 200px; height: 20px;"></div>
            </div>

            <!-- Stats cards skeleton -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
                ${Array(4).fill(0).map(() => `
                    <div style="background: #f8f9fa; border-radius: 24px; padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div class="skeleton-block" style="width: 60px; height: 40px;"></div>
                            <div class="skeleton-block" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                        </div>
                        <div class="skeleton-block" style="width: 100px; height: 20px;"></div>
                    </div>
                `).join('')}
            </div>

            <!-- Chart panel skeleton -->
            <div style="background: #f8f9fa; border-radius: 28px; padding: 22px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 18px;">
                    <div class="skeleton-block" style="width: 150px; height: 24px;"></div>
                    <div class="skeleton-block" style="width: 100px; height: 30px;"></div>
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    ${Array(3).fill(0).map(() => `
                        <div class="skeleton-block" style="width: 80px; height: 30px;"></div>
                    `).join('')}
                </div>
                <div class="skeleton-block" style="width: 100%; height: 300px;"></div>
            </div>

            <!-- Two column layout skeleton -->
            <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; margin-bottom: 30px;">
                <!-- Table skeleton -->
                <div style="background: #f8f9fa; border-radius: 24px; padding: 24px;">
                    <div class="skeleton-block" style="width: 200px; height: 30px; margin-bottom: 20px;"></div>
                    ${Array(4).fill(0).map(() => `
                        <div style="display: flex; gap: 10px; margin-bottom: 15px; padding: 10px 0;">
                            <div class="skeleton-block" style="width: 50px; height: 20px;"></div>
                            <div class="skeleton-block" style="width: 150px; height: 20px;"></div>
                            <div class="skeleton-block" style="width: 80px; height: 20px;"></div>
                            <div class="skeleton-block" style="width: 70px; height: 20px;"></div>
                            <div class="skeleton-block" style="width: 60px; height: 30px;"></div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Notifications skeleton -->
                <div style="background: #f8f9fa; border-radius: 24px; padding: 24px;">
                    <div class="skeleton-block" style="width: 150px; height: 30px; margin-bottom: 20px;"></div>
                    ${Array(4).fill(0).map(() => `
                        <div style="display: flex; gap: 16px; margin-bottom: 15px;">
                            <div class="skeleton-block" style="width: 40px; height: 40px; border-radius: 14px;"></div>
                            <div style="flex: 1;">
                                <div class="skeleton-block" style="width: 100%; height: 20px; margin-bottom: 5px;"></div>
                                <div class="skeleton-block" style="width: 80px; height: 15px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Quick actions skeleton -->
            <div style="background: #f8f9fa; border-radius: 24px; padding: 24px;">
                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                    <div class="skeleton-block" style="flex: 1; height: 50px;"></div>
                    <div class="skeleton-block" style="flex: 1; height: 50px;"></div>
                </div>
                <div class="skeleton-block" style="width: 100%; height: 60px;"></div>
            </div>
        </div>
    `;

    // Hide the original body content and append skeleton
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    document.body.appendChild(skeletonContainer);

    // Function to remove skeleton and show original content
    function showOriginalContent() {
        // Fade out skeleton
        skeletonContainer.style.opacity = '0';

        setTimeout(() => {
            // Remove skeleton container
            if (skeletonContainer.parentNode) {
                skeletonContainer.parentNode.removeChild(skeletonContainer);
            }

            // Show original content with fade in
            document.body.style.opacity = '1';

            // Remove the style element
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }

            // Remove this script tag from the DOM
            if (originalScript && originalScript.parentNode) {
                originalScript.parentNode.removeChild(originalScript);
            }

            // Clean up
            window.skeletonLoadingActive = false;
        }, 500); // Match the transition duration
    }

    // Wait for the page to be fully loaded
    if (document.readyState === 'complete') {
        // Page already loaded, show content immediately
        showOriginalContent();
    } else {
        // Wait for load event
        window.addEventListener('load', function () {
            // Add a small delay to ensure all scripts have executed
            setTimeout(showOriginalContent, 100);
        });

        // Fallback: if load event doesn't fire within 10 seconds, show content anyway
        setTimeout(function () {
            if (document.body.contains(skeletonContainer)) {
                showOriginalContent();
            }
        }, 10000);
    }

    // Handle navigation/back button cases
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            // Page was loaded from cache (bfcache)
            if (document.body.contains(skeletonContainer)) {
                showOriginalContent();
            }
        }
    });
})();
