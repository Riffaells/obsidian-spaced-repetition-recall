import { test, expect } from "bun:test";
test("env test", () => {
    console.log("document:", typeof document);
    console.log("window:", typeof window);
    console.log("HTMLElement:", typeof HTMLElement);
    console.log("TouchEvent:", typeof TouchEvent);
    console.log("createElement:", document.createElement.toString());
});

test("event test", () => {
    const el = document.createElement("div");
    let called = false;
    el.addEventListener("click", () => {
        called = true;
    });
    el.dispatchEvent(new Event("click"));
    expect(called).toBe(true);

    // Test Obsidian extensions
    const castEl = el as any;
    expect(typeof castEl.addClass).toBe("function");
    castEl.addClass("test-class");
    expect(el.className).toContain("test-class");

    const div = castEl.createDiv("inner");
    expect(div).toBeTruthy();
    expect(div.className).toContain("inner");
    expect(el.contains ? el.contains(div) : true).toBe(true);
});

test("touch event test", () => {
    const el = document.createElement("div");
    let receivedTouches = 0;
    el.addEventListener("touchstart", (e: any) => {
        receivedTouches = e.touches.length;
    });

    // Check if TouchEvent constructor works with init
    try {
        const ev = new TouchEvent("touchstart", {
            touches: [{ clientX: 1, clientY: 2 }] as any,
        });
        el.dispatchEvent(ev);
        console.log("Received touches:", receivedTouches);
    } catch (err) {
        console.error("TouchEvent constructor failed:", err);
    }
});
