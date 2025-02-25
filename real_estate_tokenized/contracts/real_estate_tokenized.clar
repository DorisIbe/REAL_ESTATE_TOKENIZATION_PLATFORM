;; Real Estate Tokenization Platform

;; Define constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Define data variables
(define-data-var total-properties uint u0)

;; Define data maps
(define-map properties
  uint
  {
    owner: principal,
    price: uint,
    location: (string-ascii 50),
    tokenized: bool
  }
)

(define-map property-tokens
  uint
  {
    total-supply: uint,
    tokens-remaining: uint
  }
)

;; Define non-fungible token
(define-non-fungible-token property-token uint)

;; Add a new property
(define-public (add-property (price uint) (location (string-ascii 50)))
  (let ((property-id (var-get total-properties)))
    (if (is-eq tx-sender contract-owner)
      (begin
        (map-set properties property-id {
          owner: contract-owner,
          price: price,
          location: location,
          tokenized: false
        })
        (var-set total-properties (+ property-id u1))
        (ok property-id)
      )
      err-owner-only
    )
  )
)

;; Tokenize a property
(define-public (tokenize-property (property-id uint) (total-tokens uint))
  (let ((property (unwrap! (map-get? properties property-id) err-not-found)))
    (if (and (is-eq (get owner property) tx-sender) (not (get tokenized property)))
      (begin
        (map-set properties property-id (merge property { tokenized: true }))
        (map-set property-tokens property-id {
          total-supply: total-tokens,
          tokens-remaining: total-tokens
        })
        (ok true)
      )
      err-unauthorized
    )
  )
)

;; Buy property tokens
(define-public (buy-tokens (property-id uint) (token-amount uint))
  (let (
    (property (unwrap! (map-get? properties property-id) err-not-found))
    (tokens (unwrap! (map-get? property-tokens property-id) err-not-found))
  )
    (if (and 
          (get tokenized property)
          (<= token-amount (get tokens-remaining tokens))
        )
      (begin
        (try! (stx-transfer? (* token-amount (/ (get price property) (get total-supply tokens))) tx-sender (get owner property)))
        (map-set property-tokens property-id 
          (merge tokens { tokens-remaining: (- (get tokens-remaining tokens) token-amount) })
        )
        (nft-mint? property-token property-id tx-sender)
      )
      err-unauthorized
    )
  )
)

;; Get property details
(define-read-only (get-property (property-id uint))
  (map-get? properties property-id)
)

;; Get token details for a property
(define-read-only (get-property-tokens (property-id uint))
  (map-get? property-tokens property-id)
)