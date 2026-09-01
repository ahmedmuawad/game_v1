#!/bin/sh
# ينزّل الشبكة الأساسية (CC0) — غير مخزّنة في المستودع لحجمها
set -e
cd "$(dirname "$0")"
curl -sL -o base.obj \
  "https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj"
echo "تم التنزيل: $(wc -c < base.obj) بايت"
