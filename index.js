var T = Object.defineProperty,
  M = Object.defineProperties;
var S = Object.getOwnPropertyDescriptors;
var b = Object.getOwnPropertySymbols;
var P = Object.prototype.hasOwnProperty,
  x = Object.prototype.propertyIsEnumerable;
var w = (r, e, t) =>
  e in r ? T(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : (r[e] = t),
  f = (r, e) => {
    for (var t in (e ||= {})) P.call(e, t) && w(r, t, e[t]);
    if (b) for (var t of b(e)) x.call(e, t) && w(r, t, e[t]);
    return r;
  },
  g = (r, e) => M(r, S(e));
var h = (r, e, t) => (w(r, typeof e != 'symbol' ? e + '' : e, t), t);
var o = (r, e, t) =>
  new Promise((n, s) => {
    var i = (l) => {
      try {
        d(t.next(l));
      } catch (p) {
        s(p);
      }
    },
      a = (l) => {
        try {
          d(t.throw(l));
        } catch (p) {
          s(p);
        }
      },
      d = (l) => (l.done ? n(l.value) : Promise.resolve(l.value).then(i, a));
    d((t = t.apply(r, e)).next());
  });
import { html as u, render as y } from 'https://unpkg.com/lit-html?module';
var E = {
  1: 'Ethereum Mainnet',
  80001: 'Mumbai Testnet',
  137: 'Polygon Mainnet',
  5: 'Goerli Testnet',
},
  c = {
    NOT_ON_ALLOWLIST: "This address isn't on the allowlist.",
    ERROR_FETCHING_ALLOWLIST: 'Error fetching allowlist data. Please reload & try again.',
    INVALID_QUANTITY: 'Please enter a valid quantity.',
    PRESALE_SOLD_OUT: (r) => `Not enough tokens left in the presale to purchase ${r}.`,
    SOLD_OUT: (r) => `Not enough tokens left in the sale to purchase ${r}.`,
    INCORRECT_CHAIN: (r, e) => {
      var t, n;
      return `Please switch to the correct network. Expected ${(t = E[e]) != null ? t : e
        } but got ${(n = E[r]) != null ? n : r}.`;
    },
    SALE_NOT_STARTED: 'Sale has not yet started.',
    INSUFFICIENT_BALANCE: (r, e) =>
      `You have an insufficient balance to complete this transaction. Mint cost: ${r} (+ gas). Current balance: ${e}.`,
    MAX_PER_TRANSACTION: (r) => `You can only mint up to ${r} tokens at a time.`,
    MAX_PER_WALLET: (r) => `You can only mint up to ${r} tokens per wallet.`,
    TRANSACTION_REVERTED:
      'Your transaction was not successful and was reverted. Please check Etherscan for more information.',
  },
  I = class {
    constructor(e) {
      h(this, '_fetchContractData', (e, t) =>
        o(this, null, function*() {
          let n = yield fetch(`${t}/api/contract/${e}/mint`);
          if (!n.ok) {
            this._setErrorText(
              'There was an error fetching contract information. Please reload and try again.',
            );
            return;
          }
          let s = yield n.json();
          return {
            allowlistId: s.snapshotSk,
            contractAddress: s.contractAddress,
            chainId: s.chainId,
            projectSk: s.projectSk,
          };
        }),
      );
      h(this, '_connectWallet', () =>
        o(this, null, function*() {
          let e;
          try {
            (e = new ethers.providers.Web3Provider(yield window.__BUENO__.web3Modal.connect())),
              e.provider.on('accountsChanged', this.reload.bind(this)),
              e.provider.on('chainChanged', this.reload.bind(this)),
              e.provider.on('networkChanged', this.reload.bind(this));
            let t = yield e.getNetwork();
            if (t.chainId !== this.options.chainId) {
              this._setErrorText(c.INCORRECT_CHAIN(t.chainId, this.options.chainId));
              return;
            }
            (this.provider = e),
              yield this._fetchWalletInfo(),
              (this.contract = yield this._initContract()),
              yield this._refreshSaleState(),
              yield this._fetchPricingInfo(),
              this._updateMintQuantity(),
              setInterval(this._updateMintQuantity, 2e4),
              this._updatePrice();
          } catch (t) {
            console.log(t);
          }
          return e;
        }),
      );
      h(this, '_updateMintQuantity', () =>
        o(this, null, function*() {
          (this.quantityMinted = yield this.contract.totalSupply()), this._renderDom();
        }),
      );
      h(this, '_setErrorText', (e) => {
        (this.errorText = e), (this.success = !1), this._renderDom();
      });
      h(this, '_setSuccess', () => {
        (this.success = !0), (this.errorText = ''), this._renderDom();
      });
      h(this, '_updatePrice', () =>
        o(this, null, function*() {
          if (!this.options.showPrice || this.saleState === 0) return;
          let e = Number(document.getElementById('quantity').value);
          if (isNaN(e) || e < 0) return;
          let t = this.saleState === 2 ? this.presalePrice : this.publicPrice;
          (this.price = t.mul(e)), this._renderDom();
        }),
      );
      h(this, '_handleMintClick', (e) =>
        o(this, null, function*() {
          e.preventDefault(), (this.buttonState = 'minting'), this._setErrorText('');
          let t = yield this.provider.getSigner(),
            n = yield this.provider.getNetwork(),
            s = yield t.getAddress();
          try {
            if (n.chainId !== this.options.chainId)
              throw new Error(c.INCORRECT_CHAIN(this.options.chainId, n.chainId));
            let i = Number(document.getElementById('quantity').value);
            if (!i || isNaN(i) || i < 0) throw new Error(c.INVALID_QUANTITY);
            let a = yield this.contract.saleState();
            if (a === 0) throw new Error(c.SALE_NOT_STARTED);
            let d = yield t.getBalance();
            yield Promise.all([this._fetchPricingInfo(), this._updateMintQuantity()]);
            let l = a === 2 ? this.presalePrice.mul(i) : this.publicPrice.mul(i);
            if (d.lt(l))
              throw new Error(
                c.INSUFFICIENT_BALANCE(ethers.utils.formatEther(l), ethers.utils.formatEther(d)),
              );
            let [p, m] = yield this._getMintRules(a);
            if (p.gt(0) && p.lt(i)) throw new Error(c.MAX_PER_TRANSACTION(p));
            if (m.gt(0) && (yield this._getMintBalance(s)).add(i).gt(m))
              throw new Error(c.MAX_PER_WALLET(m));
            let _;
            if (a === 2) {
              if (this.quantityMinted.add(i).gt(this.presaleSupply))
                throw new Error(c.PRESALE_SOLD_OUT(i));
              if (!this.merkleProof && this.options.allowlistId)
                throw new Error(c.NOT_ON_ALLOWLIST);
              let v = this.merkleProof ? [i, this.merkleProof] : [i];
              _ = yield this.contract.connect(t).presale(...v, { value: l });
            } else {
              if (this.quantityMinted.add(i).gt(this.totalSupply)) throw new Error(c.SOLD_OUT(i));
              _ = yield this.contract.connect(t).mint(i, { value: l });
            }
            if (
              (yield this.provider.waitForTransaction(_.hash),
                !(yield this.provider.getTransactionReceipt(_.hash)).status)
            )
              throw new Error(c.TRANSACTION_REVERTED);
            this._updateMintQuantity(), this._setSuccess();
          } catch (i) {
            console.error(i), this._setErrorText(i.message);
          } finally {
            (this.buttonState = 'idle'), this._renderDom();
          }
        }),
      );
      (this.initialized = !1),
        (this.quantityMinted = 0),
        (this.totalSupply = 0),
        this.connectedAddress,
        (this.buttonState = 'idle'),
        (this.success = !1),
        (this.saleState = 0),
        (this.options = {
          embedContainer: e,
          buenoBaseUri: 'https://nft.bueno.art',
          button: { background: '#5062FE' },
          contractId: '',
          allowlistId: '',
          contractAddress: '',
          projectSk: '',
          chainId: 0,
          showPrice: !0,
          showSupply: !0,
          autoConnect: !0,
          price: void 0,
          presalePrice: void 0,
        });
    }
    init(e) {
      return o(this, null, function*() {
        var s;
        if (this.initialized) {
          this._integrationError('Already initialized widget');
          return;
        }
        window.__BUENO__ = window.__BUENO__ || {};
        let t = document.createElement('div');
        if (
          ((t.style = 'box-sizing: border-box; margin: 0; padding: 0;'),
            (this.embedContainer = this.options.embedContainer.appendChild(t)),
            !this.options.embedContainer)
        ) {
          this._integrationError("'embedContainer' is required");
          return;
        }
        if (e.contractId) {
          let i = yield this._fetchContractData(
            e.contractId,
            (s = e.buenoBaseUri) != null ? s : this.options.buenoBaseUri,
          );
          this.options = f(f(f({}, this.options), e), i);
        } else if (!e.contractAddress || !e.chainId) {
          this._integrationError('Contract address and chainId are required');
          return;
        } else this.options = g(f(f({}, this.options), e), { chainId: Number(e.chainId) });
        if (
          (console.log('loaded options', this.options),
            yield this._loadScripts(),
            (window.__BUENO__.web3Modal = this._initWeb3Modal(e.isPreview)),
            !this.options.autoConnect)
        ) {
          this._renderDom();
          return;
        }
        if (!(yield this._connectWallet())) {
          this._renderDom();
          return;
        }
        this.initialized = !0;
      });
    }
    get abi() {
      let e = this.options.allowlistId
        ? 'function presale(uint256 qty, bytes32[] merkleProof) payable'
        : 'function presale(uint256 qty) payable';
      return new ethers.utils.Interface([
        'constructor(string _name, string _symbol, string _baseUri, uint96 _royaltyAmount)',
        'error ApprovalCallerNotOwnerNorApproved()',
        'error ApprovalQueryForNonexistentToken()',
        'error ApprovalToCurrentOwner()',
        'error ApproveToCaller()',
        'error BalanceQueryForZeroAddress()',
        'error InvalidPrice()',
        'error InvalidProof()',
        'error InvalidQuantity()',
        'error MintToZeroAddress()',
        'error MintZeroQuantity()',
        'error OwnerQueryForNonexistentToken()',
        'error SaleInactive()',
        'error SoldOut()',
        'error TransferCallerNotOwnerNorApproved()',
        'error TransferFromIncorrectOwner()',
        'error TransferToNonERC721ReceiverImplementer()',
        'error TransferToZeroAddress()',
        'error URIQueryForNonexistentToken()',
        'error WithdrawFailed()',
        'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
        'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
        'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
        'function _baseTokenURI() view returns (string)',
        'function addressMintBalance(address) view returns (uint256)',
        'function approve(address to, uint256 tokenId)',
        'function balanceOf(address owner) view returns (uint256)',
        'function freeMint(uint256 qty, address recipient)',
        'function getApproved(uint256 tokenId) view returns (address)',
        'function isApprovedForAll(address owner, address operator) view returns (bool)',
        'function maxPerTransaction() view returns (uint256)',
        'function maxPerWallet() view returns (uint256)',
        'function presaleMaxPerWallet() view returns (uint256)',
        'function presaleMaxPerTransaction() view returns (uint256)',
        'function merkleRoot() view returns (bytes32)',
        'function mint(uint256 qty) payable',
        'function name() view returns (string)',
        'function owner() view returns (address)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function presalePrice() view returns (uint256)',
        'function presaleSupply() view returns (uint256)',
        'function price() view returns (uint256)',
        'function renounceOwnership()',
        'function royaltyInfo(uint256 _tokenId, uint256 _salePrice) view returns (address, uint256)',
        'function safeTransferFrom(address from, address to, uint256 tokenId)',
        'function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data)',
        'function saleState() view returns (uint8)',
        'function setApprovalForAll(address operator, bool approved)',
        'function setBaseURI(string baseURI)',
        'function setMerkleRoot(bytes32 _merkleRoot)',
        'function setPerTransactionMax(uint256 _val)',
        'function setPerWalletMax(uint256 _val)',
        'function setPresalePrice(uint256 newPrice)',
        'function setPrice(uint256 newPrice)',
        'function setRoyaltyInfo(address receiver, uint96 feeBasisPoints)',
        'function setSaleState(uint8 _state)',
        'function supply() view returns (uint256)',
        'function supportsInterface(bytes4 interfaceId) view returns (bool)',
        'function symbol() view returns (string)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function transferFrom(address from, address to, uint256 tokenId)',
        'function transferOwnership(address newOwner)',
        'function withdraw()',
        'function withdrawAddresses(uint256) view returns (address)',
        'function withdrawPercentages(uint256) view returns (uint256)',
        e,
      ]).format(ethers.utils.FormatTypes.json);
    }
    destroy() {
      this.initialized = !1;
      let e = document.getElementById('WEB3_CONNECT_MODAL_ID');
      e && e.remove(), this.embedContainer.remove();
    }
    reload() {
      this.destroy(), this.init(this.options);
    }
    _integrationError(e) {
      console.error(
        '%c [Bueno.art]: ',
        'font-weight: bold;',
        e,
        `

Contact support for more help.`,
      ),
        (this.embedContainer.innerHTML =
          'Failed to initialize widget. Please check developer console for more information.');
    }
    _initContract() {
      return o(this, null, function*() {
        if (this.initialized) return;
        let e = yield this.provider.getSigner(),
          t = new ethers.Contract(this.options.contractAddress, this.abi, e);
        this.totalSupply = yield t.supply();
        try {
          this.presaleSupply = yield t.presaleSupply();
        } catch (n) { }
        return t;
      });
    }
    _initWeb3Modal(e) {
      if (this.initialized) return;
      let t = window.Web3Modal.default,
        s = {
          walletconnect: {
            package: window.WalletConnectProvider.default,
            options: {
              chainId: this.options.chainId,
              rpc: {
                1: 'https://eth-mainnet.alchemyapi.io/v2/TopoeiFbKEVFi5MHuTxmkYyeuPdeXx_Z',
                80001: 'https://polygon-mumbai.g.alchemy.com/v2/IQqWYg1p1x-dCXCmb56izxlma_kfWcU2',
                137: 'https://polygon-mainnet.g.alchemy.com/v2/zvijdLmpOOdxEIm644rKgfh-cbmT2LIq',
                5: 'https://eth-goerli.g.alchemy.com/v2/W6D-sFXTf-zLKp-SeK4NepcqvXtFqJmE',
              },
            },
          },
        };
      return new t({ providerOptions: e ? {} : s });
    }
    _loadScripts() {
      return o(this, null, function*() {
        if (this.initialized) return;
        let e = (t, n) =>
          new Promise((s, i) => {
            let a = document.createElement('script');
            (a.src = t),
              n != null && n.type && (a.type = n.type),
              a.addEventListener('load', s),
              a.addEventListener('error', (d) => i(d.error)),
              this.embedContainer.appendChild(a);
          });
        yield Promise.all([
          e('https://unpkg.com/ethers@5.6.8/dist/ethers.umd.js'),
          e('https://unpkg.com/@walletconnect/web3-provider@1.7.0/dist/umd/index.min.js'),
          e('https://unpkg.com/web3modal@1.9.9/dist/index.js'),
        ]);
      });
    }
    _fetchPricingInfo() {
      return o(this, null, function*() {
        if (this.options.presalePrice)
          this.presalePrice = ethers.utils.parseEther(this.options.presalePrice);
        else
          try {
            this.presalePrice = yield this.contract.presalePrice();
          } catch (e) { }
        this.options.price
          ? (this.publicPrice = ethers.utils.parseEther(this.options.price))
          : (this.publicPrice = yield this.contract.price());
      });
    }
    _getMintBalance(e) {
      return o(this, null, function*() {
        let t = ethers.BigNumber.from(0);
        try {
          t = yield this.contract.addressMintBalance(e);
        } catch (n) { }
        return t;
      });
    }
    _getMintRules(e) {
      return o(this, null, function*() {
        let t = ethers.BigNumber.from(0),
          n = ethers.BigNumber.from(0),
          s = this.contract,
          [i, a] =
            e === 2
              ? [s.presaleMaxPerWallet, s.presaleMaxPerTransaction]
              : [s.maxPerWallet, s.maxPerTransaction];
        try {
          t = yield i();
        } catch (d) { }
        try {
          n = yield a();
        } catch (d) { }
        return [n, t];
      });
    }
    _fetchMerkleProof() {
      return o(this, null, function*() {
        if (!(!this.options.allowlistId || !this.connectedAddress) && !(this.saleState < 2)) {
          this._setErrorText(''), (this.buttonState = 'fetching');
          try {
            let e = yield fetch(
              `${this.options.buenoBaseUri}/api/projects/${this.options.projectSk
              }/snapshots/${encodeURIComponent(this.options.allowlistId)}/merkle?address=${this.connectedAddress
              }`,
            );
            if (e.ok) {
              let t = yield e.json();
              if (!(t != null && t.length)) throw new Error(c.NOT_ON_ALLOWLIST);
              this.merkleProof = t;
            } else throw new Error(c.ERROR_FETCHING_ALLOWLIST);
          } catch (e) {
            console.error(e), this._setErrorText(e.message);
          } finally {
            (this.buttonState = 'idle'), this._renderDom();
          }
        }
      });
    }
    _fetchWalletInfo() {
      return o(this, null, function*() {
        var t, n;
        let e = yield (n = (t = this.provider) == null ? void 0 : t.getSigner) == null
          ? void 0
          : n.call(t).getAddress();
        (this.connectedAddress = e), this._renderDom();
      });
    }
    get currencySymbol() {
      return [80001, 137].includes(this.options.chainId) ? 'MATIC' : 'ETH';
    }
    _refreshSaleState() {
      return o(this, null, function*() {
        let e = yield this.contract.saleState();
        (this.saleState = e), e === 2 && this._fetchMerkleProof(), this._renderDom();
      });
    }
    _renderConnectWalletButton() {
      return u` ${this.errorText
        ? u`<div style="color: red; margin-bottom: 14px;">${this.errorText}</div>`
        : ''
        }
      <button @click=${this._connectWallet} class="bueno__connect-button">Connect Wallet</button
      >${this._renderStyles()}`;
    }
    _renderBuenoLogo() {
      return u`<svg width="144" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 14.573V4.392h3.44c.8 0 1.452.144 1.96.432.51.285.887.671 1.133 1.159.245.487.368 1.03.368 1.63 0 .6-.123 1.145-.368 1.636-.242.49-.617.881-1.124 1.173-.507.288-1.157.433-1.949.433H.994V9.76H3.42c.547 0 .986-.095 1.318-.283a1.69 1.69 0 0 0 .72-.766c.153-.325.23-.691.23-1.099 0-.407-.077-.772-.23-1.094a1.632 1.632 0 0 0-.725-.755c-.335-.186-.779-.279-1.332-.279H1.233v9.088H0ZM11.873 14.732c-.69 0-1.294-.164-1.815-.492a3.343 3.343 0 0 1-1.213-1.377c-.288-.59-.432-1.28-.432-2.068 0-.795.144-1.49.432-2.083a3.338 3.338 0 0 1 1.213-1.382c.52-.328 1.126-.492 1.815-.492.69 0 1.293.164 1.81.492.52.328.924.789 1.213 1.382.291.593.437 1.288.437 2.083 0 .789-.146 1.478-.437 2.068a3.298 3.298 0 0 1-1.214 1.377c-.517.328-1.12.492-1.81.492Zm0-1.053c.524 0 .954-.135 1.293-.403.338-.269.588-.622.75-1.06.163-.437.244-.91.244-1.421 0-.51-.081-.986-.244-1.427a2.405 2.405 0 0 0-.75-1.069c-.339-.272-.77-.407-1.293-.407-.524 0-.955.135-1.293.407a2.405 2.405 0 0 0-.75 1.07c-.163.44-.244.916-.244 1.426 0 .51.081.984.244 1.422.162.437.412.79.75 1.059.338.268.77.402 1.293.402ZM18.72 14.573l-2.327-7.636h1.233l1.65 5.847h.08l1.63-5.847h1.253l1.611 5.827h.08l1.65-5.827h1.233l-2.326 7.636h-1.154l-1.67-5.866h-.12l-1.67 5.866h-1.154ZM31.431 14.732c-.736 0-1.37-.162-1.904-.487a3.27 3.27 0 0 1-1.228-1.372c-.285-.59-.427-1.276-.427-2.058 0-.782.142-1.472.427-2.068.288-.6.69-1.068 1.203-1.402.517-.338 1.12-.507 1.81-.507.398 0 .79.066 1.178.198.388.133.741.349 1.06.647.317.295.57.686.76 1.173.189.487.283 1.087.283 1.8v.497h-5.886v-1.014H33.4c0-.431-.086-.816-.258-1.154a1.948 1.948 0 0 0-.726-.8c-.312-.196-.68-.293-1.104-.293-.467 0-.872.116-1.213.348a2.289 2.289 0 0 0-.78.894 2.629 2.629 0 0 0-.274 1.184v.676c0 .577.1 1.066.298 1.466.202.398.483.701.84.91.358.206.774.309 1.248.309.308 0 .587-.044.835-.13.252-.09.47-.222.652-.397.182-.18.323-.401.422-.667l1.134.319c-.12.384-.32.722-.602 1.014-.281.288-.63.514-1.044.676-.414.159-.88.239-1.397.239ZM36.503 14.573V6.937h1.133V8.09h.08c.14-.377.391-.684.756-.92a2.224 2.224 0 0 1 1.233-.352c.086 0 .194.001.323.005.13.003.227.008.293.015V8.03c-.04-.01-.13-.025-.273-.045a2.691 2.691 0 0 0-.443-.035c-.37 0-.702.078-.994.234a1.762 1.762 0 0 0-.686.636 1.715 1.715 0 0 0-.249.92v4.832h-1.173ZM44.806 14.732c-.735 0-1.37-.162-1.904-.487a3.27 3.27 0 0 1-1.228-1.372c-.285-.59-.427-1.276-.427-2.058 0-.782.142-1.472.427-2.068.288-.6.69-1.068 1.203-1.402.517-.338 1.12-.507 1.81-.507.398 0 .79.066 1.178.198.388.133.741.349 1.06.647.317.295.57.686.76 1.173.189.487.283 1.087.283 1.8v.497h-5.886v-1.014h4.693c0-.431-.086-.816-.258-1.154a1.948 1.948 0 0 0-.726-.8c-.312-.196-.68-.293-1.104-.293-.467 0-.872.116-1.213.348a2.289 2.289 0 0 0-.78.894 2.629 2.629 0 0 0-.274 1.184v.676c0 .577.1 1.066.298 1.466.202.398.482.701.84.91.358.206.774.309 1.248.309.309 0 .587-.044.836-.13.251-.09.468-.222.65-.397.183-.18.324-.401.423-.667l1.134.319c-.12.384-.32.722-.602 1.014-.281.288-.63.514-1.044.676-.414.159-.88.239-1.397.239ZM52.761 14.732c-.636 0-1.198-.16-1.685-.482-.487-.325-.868-.782-1.143-1.372-.275-.593-.413-1.294-.413-2.103 0-.802.138-1.498.413-2.088.275-.59.658-1.046 1.148-1.367.49-.322 1.057-.482 1.7-.482.498 0 .89.082 1.179.248.291.163.513.348.666.557.156.206.277.375.363.507h.1V4.392h1.172v10.181h-1.133V13.4h-.14c-.085.14-.208.315-.367.527-.16.209-.386.396-.681.562-.295.162-.688.243-1.178.243Zm.16-1.053c.47 0 .868-.123 1.193-.368.325-.249.572-.592.74-1.03.17-.44.254-.95.254-1.526 0-.57-.083-1.069-.248-1.496-.166-.431-.411-.766-.736-1.004-.325-.242-.726-.363-1.203-.363-.498 0-.912.127-1.243.382a2.292 2.292 0 0 0-.741 1.03c-.162.43-.244.914-.244 1.451 0 .544.083 1.038.249 1.482.169.44.418.792.746 1.054.331.258.742.387 1.233.387ZM62.92 14.573V4.392h1.173V8.15h.1c.086-.132.205-.301.358-.507.155-.209.377-.394.666-.557.291-.166.686-.248 1.183-.248.643 0 1.21.16 1.7.482.49.321.874.777 1.149 1.367s.412 1.286.412 2.088c0 .809-.137 1.51-.412 2.103-.275.59-.656 1.047-1.144 1.372-.487.322-1.049.482-1.685.482-.49 0-.883-.08-1.178-.243a2.184 2.184 0 0 1-.681-.562 7.561 7.561 0 0 1-.368-.527h-.14v1.173H62.92Zm1.153-3.818c0 .577.085 1.086.254 1.526.169.438.416.781.74 1.03.326.245.723.367 1.194.367.49 0 .9-.129 1.228-.387.331-.262.58-.613.746-1.054.169-.444.253-.938.253-1.482 0-.537-.083-1.02-.248-1.451a2.243 2.243 0 0 0-.741-1.03c-.328-.255-.741-.382-1.238-.382-.477 0-.879.12-1.203.363-.325.238-.57.573-.736 1.004-.166.427-.249.926-.249 1.496ZM72.063 17.437c-.198 0-.376-.017-.532-.05a1.403 1.403 0 0 1-.323-.09l.299-1.033c.285.073.536.1.755.08a.906.906 0 0 0 .582-.294c.172-.172.33-.452.472-.84l.219-.597-2.824-7.676h1.273l2.108 6.085h.08l2.107-6.085h1.273l-3.242 8.75c-.145.394-.326.72-.541.98a2.03 2.03 0 0 1-.751.581c-.282.126-.6.19-.955.19Z"
        fill="#7E7D7D"
      />
      <g clip-path="url(#a)">
        <path
          d="M96.395 4.79a4.43 4.43 0 0 0-.62-.506l.5-3.303a.348.348 0 0 0-.072-.271.314.314 0 0 0-.244-.118H92.327c-1.959.072-3.94.818-5.376 2.331-1.401 1.478-2.254 3.66-2.081 6.576v.014c-.075.003-.15.012-.223.025-.651.12-1.152.613-1.385 1.205-.236.596-.214 1.326.217 1.923.153.213.352.401.598.558a1.49 1.49 0 0 0-.155.665c0 .793.613 1.437 1.37 1.437.539 0 1.005-.327 1.228-.803a6.701 6.701 0 0 0 2.244 1.741c1.571.768 3.346.976 4.81.976 1.708 0 3.066-.774 3.993-1.701a5.935 5.935 0 0 0 1.069-1.443c.241-.467.387-.932.387-1.312 0-.394-.045-.756-.113-1.086.55-.41.91-1.085.91-1.848 0-1.176-.855-2.143-1.948-2.253-.289-1.154-.751-2.097-1.477-2.807Z"
          fill="#7E7D7D"
          stroke="#7E7D7D"
          stroke-width=".208"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M91.435 3.589c-6.166 0-6.775 5.213-5.934 8.225 1.194 4.274 5.203 5.093 8.083 5.093 3.222 0 5.129-2.915 5.129-4.12 0-1.583-.768-2.629-.84-3.313-.414-3.979-1.936-5.885-6.438-5.885Z"
          fill="#fff"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M86.125 6.724c-.77 1.582-.722 3.545-.317 4.995.567 2.03 1.796 3.235 3.237 3.939 1.452.71 3.122.912 4.539.912 1.513 0 2.72-.683 3.552-1.515.416-.416.734-.866.947-1.277.217-.419.31-.77.31-.991 0-.733-.178-1.346-.372-1.873a17.064 17.064 0 0 0-.163-.422 18.52 18.52 0 0 1-.121-.312 2.81 2.81 0 0 1-.182-.67c-.204-1.961-.676-3.334-1.587-4.226-.909-.89-2.317-1.36-4.533-1.36-2.983 0-4.555 1.25-5.31 2.8Zm-.57-.306c.881-1.81 2.696-3.166 5.88-3.166 2.286 0 3.89.483 4.97 1.54 1.08 1.057 1.576 2.627 1.787 4.644.012.124.06.281.14.498a16.947 16.947 0 0 0 .134.342c.049.123.1.255.152.395.208.564.415 1.265.415 2.116 0 .38-.146.845-.387 1.312-.246.474-.606.98-1.069 1.443-.927.927-2.285 1.7-3.993 1.7-1.464 0-3.238-.207-4.81-.975-1.582-.773-2.954-2.116-3.58-4.36-.437-1.562-.505-3.711.361-5.489Z"
          fill="#7E7D7D"
        />
        <path
          d="M92.373.933c-3.803.126-7.644 2.88-7.155 8.843.96-4.36 5.881-6.207 7.764-3.434l-.61-5.41Z"
          fill="#7E7D7D"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M92.362.595a.326.326 0 0 1 .328.296l.61 5.41a.338.338 0 0 1-.202.353.311.311 0 0 1-.376-.119c-.828-1.218-2.349-1.465-3.85-.84-1.494.622-2.887 2.09-3.342 4.155a.323.323 0 0 1-.335.26.328.328 0 0 1-.296-.306c-.252-3.068.61-5.35 2.06-6.878C88.4 1.406 90.395.66 92.362.595Zm-6.838 7.399c.73-1.403 1.887-2.414 3.112-2.924 1.35-.562 2.839-.529 3.918.327l-.464-4.115c-1.736.121-3.44.814-4.678 2.119-1.02 1.076-1.741 2.59-1.889 4.593Z"
          fill="#7E7D7D"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M89.874 2.04a.342.342 0 0 1-.173.44l-.131.06a.314.314 0 0 1-.423-.171.343.343 0 0 1 .163-.444l.145-.066c.163-.07.35.01.419.182Zm-.924.438a.346.346 0 0 1-.104.463 6.293 6.293 0 0 0-1.21 1.028.31.31 0 0 1-.452.01.348.348 0 0 1-.009-.476 6.94 6.94 0 0 1 1.334-1.134.311.311 0 0 1 .441.11Z"
          fill="#fff"
        />
        <path d="m87.174 13.292-.656-2.581c-2.787-3.442-5.508 3.613.656 2.58Z" fill="#fff" />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M84.656 9.54c.664-.12 1.405.158 2.095.944.12.136.112.349-.018.475a.31.31 0 0 1-.452-.02c-.586-.666-1.122-.808-1.515-.736-.405.074-.742.388-.904.8-.16.408-.139.88.136 1.26.277.385.854.74 1.922.797a.33.33 0 0 1 .303.353.326.326 0 0 1-.336.319c-1.181-.064-1.97-.467-2.4-1.063-.43-.598-.452-1.327-.217-1.923.234-.592.734-1.086 1.386-1.205Z"
          fill="#7E7D7D"
        />
        <path
          d="M86.35 13.892c0 .609-.47 1.102-1.049 1.102-.58 0-1.049-.493-1.049-1.102 0-.608.47-1.101 1.049-1.101.58 0 1.05.493 1.05 1.101Z"
          fill="#fff"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M85.303 13.126c-.403 0-.729.343-.729.766 0 .422.326.765.729.765.402 0 .729-.343.729-.765 0-.423-.327-.766-.73-.766Zm-1.37.766c0-.794.614-1.438 1.37-1.438.756 0 1.37.644 1.37 1.438 0 .793-.614 1.437-1.37 1.437-.756 0-1.37-.644-1.37-1.438Z"
          fill="#7E7D7D"
        />
        <path
          d="M88.308 9.855c0-1.064.822-1.927 1.835-1.927h5.902c1.013 0 1.835.863 1.835 1.927s-.822 1.927-1.835 1.927h-5.901c-1.014 0-1.836-.863-1.836-1.927Z"
          fill="#7E7D7D"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M87.986 9.854c0-1.25.966-2.263 2.156-2.263h5.901c1.191 0 2.157 1.013 2.157 2.263s-.966 2.264-2.157 2.264h-5.9c-1.191 0-2.157-1.014-2.157-2.264Zm2.156-1.591c-.837 0-1.515.712-1.515 1.591s.678 1.591 1.515 1.591h5.901c.838 0 1.516-.712 1.516-1.59 0-.88-.678-1.592-1.516-1.592h-5.9Z"
          fill="#7E7D7D"
        />
        <path
          d="M89.414 9.855c0-1.064.822-1.927 1.836-1.927h6.426c1.013 0 1.835.863 1.835 1.927s-.822 1.927-1.835 1.927H91.25c-1.014 0-1.836-.863-1.836-1.927Z"
          fill="#fff"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M89.09 9.854c0-1.25.966-2.263 2.157-2.263h6.425c1.191 0 2.157 1.013 2.157 2.263s-.966 2.264-2.156 2.264h-6.426c-1.19 0-2.156-1.014-2.156-2.264Zm2.157-1.591c-.837 0-1.516.712-1.516 1.591s.679 1.591 1.516 1.591h6.425c.838 0 1.516-.712 1.516-1.59 0-.88-.678-1.592-1.516-1.592h-6.425Z"
          fill="#7E7D7D"
        />
        <path
          d="M90.852 9.844c0-.304.234-.551.524-.551h6.163c.29 0 .525.247.525.55 0 .305-.235.551-.524.551h-6.164a.538.538 0 0 1-.524-.55Z"
          fill="#7E7D7D"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M90.531 9.842c0-.49.378-.887.845-.887h6.163c.467 0 .845.397.845.887s-.378.887-.845.887h-6.163c-.467 0-.845-.397-.845-.887Zm.845-.215a.21.21 0 0 0-.204.215.21.21 0 0 0 .204.214h6.163a.21.21 0 0 0 .205-.214.21.21 0 0 0-.205-.215h-6.163Z"
          fill="#7E7D7D"
        />
        <path
          d="M91.163 9.84c0-.19.147-.345.328-.345h1.442c.181 0 .328.154.328.344 0 .19-.146.344-.328.344h-1.442a.336.336 0 0 1-.328-.344Z"
          fill="#fff"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M85.215 11.753c-.078-.035-.182-.055-.382-.048a.327.327 0 0 1-.33-.325.33.33 0 0 1 .31-.347c.24-.008.453.011.655.103.202.091.359.24.512.421a.348.348 0 0 1-.026.475.31.31 0 0 1-.452-.028c-.128-.151-.21-.216-.287-.25ZM92.255 12.839a.316.316 0 0 1 .409.204.98.98 0 0 0 .564.615c.281.121.66.158 1.125.094a.323.323 0 0 1 .36.29.333.333 0 0 1-.277.377c-.53.073-1.032.041-1.45-.139a1.638 1.638 0 0 1-.925-1.011.34.34 0 0 1 .194-.43Z"
          fill="#7E7D7D"
        />
        <path
          d="M96.36 12.089a.99.99 0 0 1-.983.998.99.99 0 0 1-.983-.998.99.99 0 0 1 .983-.998.99.99 0 0 1 .984.998Z"
          fill="#fff"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M95.278 11.62a.759.759 0 0 0-.564.479.315.315 0 0 1-.417.184.342.342 0 0 1-.175-.439c.198-.51.614-.801 1.037-.885.412-.083.88.025 1.17.385.258.322.327.843.183 1.265a1.1 1.1 0 0 1-.435.575c-.22.143-.494.202-.808.167a.332.332 0 0 1-.286-.369.324.324 0 0 1 .352-.3c.2.023.326-.018.404-.07a.433.433 0 0 0 .17-.23c.077-.225.023-.488-.07-.605-.104-.128-.314-.207-.56-.158Z"
          fill="#7E7D7D"
        />
        <path d="M95.15 6.343h-2.164l-.623-5.41h3.606l-.82 5.41Z" fill="#fff" />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M92.123.708a.314.314 0 0 1 .24-.113h3.605c.094 0 .183.043.244.118.06.074.087.173.073.27l-.82 5.41a.325.325 0 0 1-.316.284h-2.164a.326.326 0 0 1-.318-.296l-.623-5.41a.347.347 0 0 1 .079-.263Zm.6.559.546 4.738h1.606l.718-4.738h-2.87Z"
          fill="#7E7D7D"
        />
      </g>
      <path
        d="M111.407 10.654c0-1.965-1.363-3.703-3.342-3.703-.789 0-1.551.347-2.046.99h-.027V3.326h-2.554v10.897h2.528v-.855h.053c.522.682 1.19 1.002 2.006 1.002 2.059 0 3.382-1.845 3.382-3.717Zm-2.593-.013c0 .789-.629 1.457-1.431 1.457-.789 0-1.417-.668-1.417-1.457s.628-1.444 1.417-1.444c.802 0 1.431.655 1.431 1.444ZM114.635 10.948V7.084h-2.54v4.332c0 1.378.641 2.955 2.5 2.955.682 0 1.497-.294 2.046-1.03h.026v.883h2.527v-7.14h-2.54v3.864c0 .71-.428 1.097-1.043 1.097s-.976-.495-.976-1.097ZM122.409 11.296h4.947c.04-.254.04-.495.04-.749 0-2.059-1.591-3.623-3.65-3.623s-3.811 1.618-3.811 3.717c0 2.166 1.765 3.744 3.878 3.744 1.47 0 2.754-.562 3.396-1.966l-2.099-.735c-.268.441-.722.722-1.244.722-.695 0-1.324-.415-1.457-1.11Zm1.297-2.433c.641 0 1.123.374 1.216 1.016h-2.473a1.313 1.313 0 0 1 1.257-1.016ZM132.691 10.36v3.864h2.541V9.906c0-1.391-.615-2.969-2.501-2.969-.682 0-1.497.308-2.045 1.043h-.027v-.896h-2.527v7.14h2.54V10.36c0-.708.428-1.096 1.043-1.096s.976.508.976 1.096ZM135.905 10.654c0 2.18 1.779 3.73 3.918 3.73 2.139 0 3.958-1.59 3.958-3.783 0-2.166-1.819-3.677-3.905-3.677-2.099 0-3.971 1.564-3.971 3.73Zm2.554-.013c0-.776.602-1.444 1.391-1.444s1.377.668 1.377 1.444c0 .762-.588 1.457-1.377 1.457s-1.391-.682-1.391-1.457Z"
        fill="#7E7D7D"
      />
      <defs>
        <clipPath id="a">
          <path fill="#fff" transform="translate(82.556 .01)" d="M0 0h17.819v17.817H0z" />
        </clipPath>
      </defs>
    </svg>`;
    }
    get buttonText() {
      switch (this.buttonState) {
        case 'idle':
          return this.saleState === 0
            ? 'Sale Closed'
            : this.saleState === 2
              ? 'Mint Presale'
              : 'Mint';
        case 'minting':
          return 'Minting...';
        case 'fetching':
          return 'Fetching sale info...';
        default:
          return 'Mint';
      }
    }
    _renderStyles() {
      return u`<style type="text/css">
      .bueno__form {
        max-width: 574px;
      }

      .bueno__mint-button,
      .bueno__connect-button {
        height: 100%;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${this.options.button.background};
        border: none;
        border-radius: 4px;
        height: 49px;
        font-size: 16px;
        cursor: pointer;
        font-weight: 500;
        padding: 0 16px;
      }

      .bueno__connected-msg,
      .bueno__error-msg,
      .bueno__success-msg {
        margin-bottom: 14px;
      }

      .bueno__error-msg {
        color: red;
      }

      .bueno__success-msg {
        color: green;
      }

      .bueno__form-container {
        display: flex;
      }

      .bueno__column {
        display: flex;
        flex-direction: column;
        width: 50%;
      }

      .bueno__quantity-input {
        padding: 16px 12px;
        border: 1px solid #b3bec4;
        border-radius: 4px;
        margin-right: 16px;
        font-size: 16px;
      }

      .bueno__mint-progress {
        font-size: 12px;
      }

      .bueno__branding {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
    </style>`;
    }
    _renderDom() {
      var e;
      if (!this.connectedAddress) return y(this._renderConnectWalletButton(), this.embedContainer);
      y(
        u`<form class="bueno__form" id="mint-form">
          <div class="bueno__connected-msg">
            Connected with ${this.connectedAddress.slice(0, 4)}...${this.connectedAddress.slice(-4)}
          </div>

          ${this.errorText ? u`<div class="bueno__error-msg">${this.errorText}</div>` : ''}
          ${this.success ? u`<div class="bueno__success-msg">Successfully Minted Tokens</div>` : ''}

          <div class="bueno__form-container">
            <div class="bueno__column">
              <input
                class="bueno__quantity-input"
                type="number"
                name="quantity"
                id="quantity"
                placeholder="Quantity"
                value="1"
                @change=${this._updatePrice}
              />
              ${this.options.showSupply
            ? u`<p class="bueno__mint-progress">
                    ${this.quantityMinted}/${this.totalSupply}
                  </p>`
            : ''
          }
            </div>
            <div class="bueno__column">
              <button
                class="bueno__mint-button"
                @click=${this._handleMintClick}
                ?disabled=${this.buttonState !== 'idle'}
              >
                ${this.buttonText}
                ${this.options.showPrice &&
            this.price &&
            !((e = this.price) != null && e.isZero()) &&
            this.buttonState === 'idle'
            ? `(${ethers.utils.formatEther(this.price)} ${this.currencySymbol})`
            : ''
          }
              </button>
              <div class="bueno__branding">
                <div style="margin: 10px 0">

                </div>
              </div>
            </div>
          </div>
        </form>
        ${this._renderStyles()}`,
        this.embedContainer,
      );
    }
  };
export { I as BuenoWidget };
