import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def generate_pdf(html_path: Path, pdf_path: Path) -> None:
    html_uri = html_path.resolve().as_uri()
    print(f"Rendering {html_path.name} -> {pdf_path.name}")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()
        await page.goto(html_uri)
        await page.pdf(path=str(pdf_path), format="A4", print_background=True)
        await browser.close()

async def main() -> None:
    root = Path(__file__).resolve().parent
    files = [
        (root / "FLYER - L'Odyssée Express.html", root / "FLYER - L'Odyssée Express.pdf"),
        (root / "FLYER - L'Odyssée Express Yaoundé.html", root / "FLYER - L'Odyssée Express Yaoundé.pdf"),
    ]
    for html_path, pdf_path in files:
        if not html_path.exists():
            print(f"Missing HTML file: {html_path}")
            continue
        await generate_pdf(html_path, pdf_path)

if __name__ == "__main__":
    asyncio.run(main())
