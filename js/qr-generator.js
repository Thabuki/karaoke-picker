/*
 * Minimal QR code generator for share links
 * Based on https://github.com/kazuhikoarase/qrcode-generator (MIT)
 * Adapted for lightweight in-browser usage.
 */
(function () {
  function QR8bitByte(data) {
    this.mode = 1;
    this.data = data;
    this.parsedData = [];

    for (
      var i = 0, l = this.data.length;
      i < l;
      i++
    ) {
      var byteArray = [];
      var code =
        this.data.charCodeAt(i);

      if (code > 0x10000) {
        byteArray[0] =
          0xf0 |
          ((code & 0x1c0000) >>> 18);
        byteArray[1] =
          0x80 |
          ((code & 0x3f000) >>> 12);
        byteArray[2] =
          0x80 | ((code & 0xfc0) >>> 6);
        byteArray[3] =
          0x80 | (code & 0x3f);
      } else if (code > 0x800) {
        byteArray[0] =
          0xe0 |
          ((code & 0xf000) >>> 12);
        byteArray[1] =
          0x80 | ((code & 0xfc0) >>> 6);
        byteArray[2] =
          0x80 | (code & 0x3f);
      } else if (code > 0x80) {
        byteArray[0] =
          0xc0 | ((code & 0x7c0) >>> 6);
        byteArray[1] =
          0x80 | (code & 0x3f);
      } else {
        byteArray[0] = code;
      }

      this.parsedData.push(byteArray);
    }

    this.parsedData =
      Array.prototype.concat.apply(
        [],
        this.parsedData
      );
  }

  QR8bitByte.prototype = {
    getLength: function () {
      return this.parsedData.length;
    },
    write: function (buffer) {
      for (
        var i = 0,
          l = this.parsedData.length;
        i < l;
        i++
      ) {
        buffer.put(
          this.parsedData[i],
          8
        );
      }
    },
  };

  var QRUtil = (function () {
    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170],
    ];

    var G15 =
      (1 << 10) |
      (1 << 8) |
      (1 << 5) |
      (1 << 4) |
      (1 << 2) |
      (1 << 1) |
      1;
    var G15_MASK =
      (1 << 12) |
      (1 << 11) |
      (1 << 10) |
      (1 << 9) |
      (1 << 8) |
      (1 << 5) |
      (1 << 2) |
      1;
    var G15_BCH = getBCHDigit(G15);

    function getBCHDigit(data) {
      var digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    }

    function getBCHTypeInfo(data) {
      var d = data << 10;
      while (
        getBCHDigit(d) -
          getBCHDigit(G15) >=
        0
      ) {
        d ^=
          G15 <<
          (getBCHDigit(d) -
            getBCHDigit(G15));
      }
      return (
        ((data << 10) | d) ^ G15_MASK
      );
    }

    return {
      getPatternPosition: function (
        typeNumber
      ) {
        return PATTERN_POSITION_TABLE[
          typeNumber - 1
        ];
      },
      getBCHTypeInfo: getBCHTypeInfo,
      getMask: function (
        maskPattern,
        i,
        j
      ) {
        switch (maskPattern) {
          case 0:
            return (i + j) % 2 === 0;
          case 1:
            return i % 2 === 0;
          case 2:
            return j % 3 === 0;
          case 3:
            return (i + j) % 3 === 0;
          case 4:
            return (
              (Math.floor(i / 2) +
                Math.floor(j / 3)) %
                2 ===
              0
            );
          case 5:
            return (
              ((i * j) % 2) +
                ((i * j) % 3) ===
              0
            );
          case 6:
            return (
              (((i * j) % 2) +
                ((i * j) % 3)) %
                2 ===
              0
            );
          case 7:
            return (
              (((i + j) % 2) +
                ((i * j) % 3)) %
                2 ===
              0
            );
          default:
            throw new Error(
              "bad maskPattern:" +
                maskPattern
            );
        }
      },
    };
  })();

  var QRMath = (function () {
    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    for (var i = 0; i < 8; i++) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i++) {
      EXP_TABLE[i] =
        EXP_TABLE[i - 4] ^
        EXP_TABLE[i - 5] ^
        EXP_TABLE[i - 6] ^
        EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i++) {
      LOG_TABLE[EXP_TABLE[i]] = i;
    }

    return {
      gexp: function (n) {
        while (n < 0) {
          n += 255;
        }
        while (n >= 256) {
          n -= 255;
        }
        return EXP_TABLE[n];
      },
      glog: function (n) {
        if (n < 1) {
          throw new Error(
            "glog(" + n + ")"
          );
        }
        return LOG_TABLE[n];
      },
    };
  })();

  function QRPolynomial(num, shift) {
    if (num.length === undefined) {
      throw new Error(
        num.length + "/" + shift
      );
    }
    var offset = 0;
    while (
      offset < num.length &&
      num[offset] === 0
    ) {
      offset++;
    }
    this.num = new Array(
      num.length - offset + shift
    );
    for (
      var i = 0;
      i < num.length - offset;
      i++
    ) {
      this.num[i] = num[i + offset];
    }
  }

  QRPolynomial.prototype = {
    get: function (index) {
      return this.num[index];
    },
    getLength: function () {
      return this.num.length;
    },
    multiply: function (e) {
      var num = new Array(
        this.getLength() +
          e.getLength() -
          1
      );
      for (
        var i = 0;
        i < this.getLength();
        i++
      ) {
        for (
          var j = 0;
          j < e.getLength();
          j++
        ) {
          num[i + j] ^= QRMath.gexp(
            QRMath.glog(this.get(i)) +
              QRMath.glog(e.get(j))
          );
        }
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (
        this.getLength() -
          e.getLength() <
        0
      ) {
        return this;
      }
      var ratio =
        QRMath.glog(this.get(0)) -
        QRMath.glog(e.get(0));
      var num = new Array(
        this.getLength()
      );
      for (
        var i = 0;
        i < this.getLength();
        i++
      ) {
        num[i] = this.get(i);
      }
      for (
        var i = 0;
        i < e.getLength();
        i++
      ) {
        num[i] ^= QRMath.gexp(
          QRMath.glog(e.get(i)) + ratio
        );
      }
      return new QRPolynomial(
        num,
        0
      ).mod(e);
    },
  };

  function QRRSBlock(
    totalCount,
    dataCount
  ) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  QRRSBlock.RS_BLOCK_TABLE = [
    // L
    [1, 26, 19],
    [1, 44, 34],
    [1, 70, 55],
    [1, 100, 80],
    [1, 134, 108],
    [2, 86, 68],
    [2, 98, 78],
    [2, 121, 97],
    [2, 146, 116],
  ];

  QRRSBlock.getRSBlocks = function (
    typeNumber
  ) {
    var rsBlock =
      QRRSBlock.RS_BLOCK_TABLE[
        typeNumber - 1
      ];
    var length = rsBlock.length / 3;
    var list = [];
    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0];
      var totalCount =
        rsBlock[i * 3 + 1];
      var dataCount =
        rsBlock[i * 3 + 2];
      for (var c = 0; c < count; c++) {
        list.push(
          new QRRSBlock(
            totalCount,
            dataCount
          )
        );
      }
    }
    return list;
  };

  function qrPolynomial(num, shift) {
    return new QRPolynomial(num, shift);
  }

  function qrRSBlock(typeNumber) {
    return QRRSBlock.getRSBlocks(
      typeNumber
    );
  }

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }

  QRBitBuffer.prototype = {
    get: function (index) {
      var bufIndex = Math.floor(
        index / 8
      );
      return (
        ((this.buffer[bufIndex] >>>
          (7 - (index % 8))) &
          1) ===
        1
      );
    },
    put: function (num, length) {
      for (var i = 0; i < length; i++) {
        this.putBit(
          ((num >>> (length - i - 1)) &
            1) ===
            1
        );
      }
    },
    getLengthInBits: function () {
      return this.length;
    },
    putBit: function (bit) {
      var bufIndex = Math.floor(
        this.length / 8
      );
      if (
        this.buffer.length <= bufIndex
      ) {
        this.buffer.push(0);
      }
      if (bit) {
        this.buffer[bufIndex] |=
          0x80 >>> this.length % 8;
      }
      this.length++;
    },
  };

  function QRCode(
    typeNumber,
    errorCorrectLevel
  ) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel =
      errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCode.prototype = {
    addData: function (data) {
      var newData = new QR8bitByte(
        data
      );
      this.dataList.push(newData);
      this.dataCache = null;
    },
    isDark: function (row, col) {
      if (
        row < 0 ||
        this.moduleCount <= row ||
        col < 0 ||
        this.moduleCount <= col
      ) {
        throw new Error(
          row + "," + col
        );
      }
      return this.modules[row][col];
    },
    getModuleCount: function () {
      return this.moduleCount;
    },
    make: function () {
      this.makeImpl(
        false,
        QRCode.prototype.getBestMaskPattern.call(
          this
        )
      );
    },
    makeImpl: function (
      test,
      maskPattern
    ) {
      this.moduleCount =
        this.typeNumber * 4 + 17;
      this.modules = new Array(
        this.moduleCount
      );

      for (
        var row = 0;
        row < this.moduleCount;
        row++
      ) {
        this.modules[row] = new Array(
          this.moduleCount
        );
        for (
          var col = 0;
          col < this.moduleCount;
          col++
        ) {
          this.modules[row][col] = null;
        }
      }
      this.setupPositionProbePattern(
        0,
        0
      );
      this.setupPositionProbePattern(
        this.moduleCount - 7,
        0
      );
      this.setupPositionProbePattern(
        0,
        this.moduleCount - 7
      );
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(
        test,
        maskPattern
      );

      if (this.dataCache === null) {
        this.dataCache =
          QRCode.prototype.createData.call(
            this,
            this.typeNumber,
            this.errorCorrectLevel,
            this.dataList
          );
      }

      this.mapData(
        this.dataCache,
        maskPattern
      );
    },
    setupPositionProbePattern:
      function (row, col) {
        for (var r = -1; r <= 7; r++) {
          if (
            row + r <= -1 ||
            this.moduleCount <= row + r
          )
            continue;
          for (
            var c = -1;
            c <= 7;
            c++
          ) {
            if (
              col + c <= -1 ||
              this.moduleCount <=
                col + c
            )
              continue;
            if (
              (0 <= r &&
                r <= 6 &&
                (c === 0 || c === 6)) ||
              (0 <= c &&
                c <= 6 &&
                (r === 0 || r === 6)) ||
              (2 <= r &&
                r <= 4 &&
                2 <= c &&
                c <= 4)
            ) {
              this.modules[row + r][
                col + c
              ] = true;
            } else {
              this.modules[row + r][
                col + c
              ] = false;
            }
          }
        }
      },
    getBestMaskPattern: function () {
      var minLostPoint = 0;
      var pattern = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint =
          QRCode.prototype.getLostPoint(
            this
          );
        if (
          i === 0 ||
          minLostPoint > lostPoint
        ) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
    createData: function (
      typeNumber,
      errorCorrectLevel,
      dataList
    ) {
      var rsBlocks =
        qrRSBlock(typeNumber);
      var buffer = new QRBitBuffer();
      for (
        var i = 0;
        i < dataList.length;
        i++
      ) {
        buffer.put(4, 4);
        buffer.put(
          dataList[i].getLength(),
          8
        );
        dataList[i].write(buffer);
      }
      var totalDataCount = 0;
      for (
        var i = 0;
        i < rsBlocks.length;
        i++
      ) {
        totalDataCount +=
          rsBlocks[i].dataCount;
      }
      if (
        buffer.getLengthInBits() >
        totalDataCount * 8
      ) {
        throw new Error(
          "code length overflow. (" +
            buffer.getLengthInBits() +
            ">" +
            totalDataCount * 8 +
            ")"
        );
      }
      if (
        buffer.getLengthInBits() + 4 <=
        totalDataCount * 8
      ) {
        buffer.put(0, 4);
      }
      while (
        buffer.getLengthInBits() % 8 !==
        0
      ) {
        buffer.putBit(false);
      }
      while (
        buffer.getLengthInBits() <
        totalDataCount * 8
      ) {
        buffer.put(0xec, 8);
        if (
          buffer.getLengthInBits() >=
          totalDataCount * 8
        )
          break;
        buffer.put(0x11, 8);
      }

      return QRCode.prototype.createBytes(
        buffer,
        rsBlocks
      );
    },
    createBytes: function (
      buffer,
      rsBlocks
    ) {
      var offset = 0;
      var maxDcCount = 0;
      var maxEcCount = 0;
      var dcdata = new Array(
        rsBlocks.length
      );
      var ecdata = new Array(
        rsBlocks.length
      );

      for (
        var r = 0;
        r < rsBlocks.length;
        r++
      ) {
        var dcCount =
          rsBlocks[r].dataCount;
        var ecCount =
          rsBlocks[r].totalCount -
          dcCount;

        maxDcCount = Math.max(
          maxDcCount,
          dcCount
        );
        maxEcCount = Math.max(
          maxEcCount,
          ecCount
        );

        dcdata[r] = new Array(dcCount);

        for (
          var i = 0;
          i < dcCount;
          i++
        ) {
          dcdata[r][i] =
            0xff &
            buffer.buffer[i + offset];
        }
        offset += dcCount;

        var rsPoly = qrPolynomial(
          new Array(ecCount + 1),
          0
        );
        for (
          var i = 0;
          i <= ecCount;
          i++
        ) {
          rsPoly.num[i] =
            i === ecCount ? 1 : 0;
        }
        var rawPoly = qrPolynomial(
          dcdata[r],
          0
        );
        var modPoly =
          rawPoly.mod(rsPoly);

        ecdata[r] = new Array(ecCount);
        for (
          var i = 0;
          i < ecCount;
          i++
        ) {
          var modIndex =
            i +
            modPoly.num.length -
            ecCount;
          ecdata[r][i] =
            modIndex >= 0
              ? modPoly.num[modIndex]
              : 0;
        }
      }

      var totalCodeCount = 0;
      for (
        var i = 0;
        i < rsBlocks.length;
        i++
      ) {
        totalCodeCount +=
          rsBlocks[i].totalCount;
      }

      var data = new Array(
        totalCodeCount
      );
      var index = 0;

      for (
        var i = 0;
        i < maxDcCount;
        i++
      ) {
        for (
          var r = 0;
          r < rsBlocks.length;
          r++
        ) {
          if (i < dcdata[r].length) {
            data[index++] =
              dcdata[r][i];
          }
        }
      }
      for (
        var i = 0;
        i < maxEcCount;
        i++
      ) {
        for (
          var r = 0;
          r < rsBlocks.length;
          r++
        ) {
          if (i < ecdata[r].length) {
            data[index++] =
              ecdata[r][i];
          }
        }
      }
      return data;
    },
    mapData: function (
      data,
      maskPattern
    ) {
      var inc = -1;
      var row = this.moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;

      for (
        var col = this.moduleCount - 1;
        col > 0;
        col -= 2
      ) {
        if (col === 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (
              this.modules[row][
                col - c
              ] === null
            ) {
              var dark = false;
              if (
                byteIndex < data.length
              ) {
                dark =
                  ((data[byteIndex] >>>
                    bitIndex) &
                    1) ===
                  1;
              }
              var mask = QRUtil.getMask(
                maskPattern,
                row,
                col - c
              );
              if (mask) {
                dark = !dark;
              }
              this.modules[row][
                col - c
              ] = dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (
            row < 0 ||
            this.moduleCount <= row
          ) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
    getLostPoint: function (qrcode) {
      var moduleCount =
        qrcode.getModuleCount();
      var lostPoint = 0;

      for (
        var row = 0;
        row < moduleCount;
        row++
      ) {
        for (
          var col = 0;
          col < moduleCount;
          col++
        ) {
          var sameCount = 0;
          var dark = qrcode.isDark(
            row,
            col
          );
          for (
            var r = -1;
            r <= 1;
            r++
          ) {
            if (
              row + r < 0 ||
              row + r >= moduleCount
            ) {
              continue;
            }
            for (
              var c = -1;
              c <= 1;
              c++
            ) {
              if (
                col + c < 0 ||
                col + c >= moduleCount
              ) {
                continue;
              }
              if (r === 0 && c === 0) {
                continue;
              }
              if (
                dark ===
                qrcode.isDark(
                  row + r,
                  col + c
                )
              ) {
                sameCount++;
              }
            }
          }
          if (sameCount > 5) {
            lostPoint +=
              3 + sameCount - 5;
          }
        }
      }

      for (
        var row = 0;
        row < moduleCount - 1;
        row++
      ) {
        for (
          var col = 0;
          col < moduleCount - 1;
          col++
        ) {
          var count = 0;
          if (qrcode.isDark(row, col))
            count++;
          if (
            qrcode.isDark(row + 1, col)
          )
            count++;
          if (
            qrcode.isDark(row, col + 1)
          )
            count++;
          if (
            qrcode.isDark(
              row + 1,
              col + 1
            )
          )
            count++;
          if (
            count === 0 ||
            count === 4
          ) {
            lostPoint += 3;
          }
        }
      }

      for (
        var row = 0;
        row < moduleCount;
        row++
      ) {
        for (
          var col = 0;
          col < moduleCount - 6;
          col++
        ) {
          if (
            qrcode.isDark(row, col) &&
            !qrcode.isDark(
              row,
              col + 1
            ) &&
            qrcode.isDark(
              row,
              col + 2
            ) &&
            qrcode.isDark(
              row,
              col + 3
            ) &&
            qrcode.isDark(
              row,
              col + 4
            ) &&
            !qrcode.isDark(
              row,
              col + 5
            ) &&
            qrcode.isDark(row, col + 6)
          ) {
            lostPoint += 40;
          }
        }
      }

      for (
        var col = 0;
        col < moduleCount;
        col++
      ) {
        for (
          var row = 0;
          row < moduleCount - 6;
          row++
        ) {
          if (
            qrcode.isDark(row, col) &&
            !qrcode.isDark(
              row + 1,
              col
            ) &&
            qrcode.isDark(
              row + 2,
              col
            ) &&
            qrcode.isDark(
              row + 3,
              col
            ) &&
            qrcode.isDark(
              row + 4,
              col
            ) &&
            !qrcode.isDark(
              row + 5,
              col
            ) &&
            qrcode.isDark(row + 6, col)
          ) {
            lostPoint += 40;
          }
        }
      }

      var darkCount = 0;
      for (
        var row = 0;
        row < moduleCount;
        row++
      ) {
        for (
          var col = 0;
          col < moduleCount;
          col++
        ) {
          if (qrcode.isDark(row, col)) {
            darkCount++;
          }
        }
      }

      var ratio =
        Math.abs(
          (100 * darkCount) /
            moduleCount /
            moduleCount -
            50
        ) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    },
  };

  function qrCreate(typeNumber) {
    return new QRCode(typeNumber, 1);
  }

  function renderToCanvas(
    canvas,
    text,
    options
  ) {
    options = options || {};
    var margin =
      options.margin == null
        ? 4
        : options.margin;
    var typeNumber = Math.min(
      10,
      Math.max(
        1,
        options.typeNumber || 4
      )
    );
    var qrcode = qrCreate(typeNumber);
    qrcode.addData(text);
    qrcode.make();

    var moduleCount =
      qrcode.getModuleCount();
    var pixelsPerModule = Math.floor(
      (canvas.width - margin * 2) /
        moduleCount
    );
    if (pixelsPerModule <= 0) {
      throw new Error(
        "Canvas too small for QR code"
      );
    }

    var outputSize =
      pixelsPerModule * moduleCount;
    var offset = Math.floor(
      (canvas.width - outputSize) / 2
    );

    var ctx = canvas.getContext("2d");
    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.fillStyle =
      options.background || "#ffffff";
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.fillStyle =
      options.color || "#000000";

    for (
      var row = 0;
      row < moduleCount;
      row++
    ) {
      for (
        var col = 0;
        col < moduleCount;
        col++
      ) {
        if (qrcode.isDark(row, col)) {
          ctx.fillRect(
            offset +
              col * pixelsPerModule,
            offset +
              row * pixelsPerModule,
            pixelsPerModule,
            pixelsPerModule
          );
        }
      }
    }
  }

  window.SimpleQR = {
    renderToCanvas: renderToCanvas,
  };
})();
