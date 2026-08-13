#!/usr/bin/env python3
"""将 resources/fonts 的 Noto Sans CJK SC 子集化到 GB2312 常用范围，缩小安装包体积。

源字体（完整版）下载地址（覆盖后如需恢复完整字形）：
  https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf
  https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf

用法：python3 -m fontTools.subset 由本脚本内部调用，需要先 `pip3 install --user fonttools`。
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS_DIR = ROOT / "resources" / "fonts"


def gb2312_chars() -> set[str]:
    """解码 GB2312 码表得到全部 6763 个汉字（含一、二级字库）。"""
    chars: set[str] = set()
    for hi in range(0xA1, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return chars


# ASCII + Latin-1 补充 + 通用标点 + CJK 标点 + GB2312 汉字 + 全角形式
UNICODES = ",".join(
    [
        "U+0020-007E",
        "U+00A0-00FF",
        "U+2000-206F",
        "U+3000-303F",
        "U+FF00-FFEF",
        *(f"U+{ord(c):04X}" for c in sorted(gb2312_chars())),
    ]
)

FONTS = ["NotoSansCJKsc-Regular.otf", "NotoSansCJKsc-Bold.otf"]


def subset(name: str) -> None:
    src = FONTS_DIR / name
    tmp = FONTS_DIR / f"{name}.subset"
    subprocess.run(
        [
            "python3",
            "-m",
            "fontTools.subset",
            str(src),
            f"--unicodes={UNICODES}",
            "--layout-features=*",
            "--name-IDs=*",
            f"--output-file={tmp}",
            "--no-hinting",
        ],
        check=True,
    )
    tmp.replace(src)
    size_kb = src.stat().st_size / 1024
    print(f"{name}: {size_kb / 1024:.1f} MB")


if __name__ == "__main__":
    for font in FONTS:
        subset(font)
    print("done")
