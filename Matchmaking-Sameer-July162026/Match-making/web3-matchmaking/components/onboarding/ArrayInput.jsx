import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const ArrayInput = ({ 
  value = [], 
  onChange, 
  placeholder = "Enter item and press Enter",
  maxItems = 10 
}) => {
  const [inputValue, setInputValue] = useState("")

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  const addItem = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && !value.includes(trimmedValue) && value.length < maxItems) {
      onChange([...value, trimmedValue])
      setInputValue("")
    }
  }

  const removeItem = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!inputValue.trim() || value.includes(inputValue.trim()) || value.length >= maxItems}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {value.length >= maxItems && (
        <p className="text-sm text-gray-500">Maximum {maxItems} items allowed</p>
      )}
    </div>
  )
}

export default ArrayInput
