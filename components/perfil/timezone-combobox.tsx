"use client"

import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const timezones = Intl.supportedValuesOf("timeZone")

export function TimezoneCombobox({
  defaultValue,
}: {
  defaultValue?: string | null
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue ?? "")

  return (
    <>
      <input type="hidden" name="timezone" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value || "Selecione um fuso horário…"}
            <CaretUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Buscar fuso horário…" />
            <CommandList>
              <CommandEmpty>Nenhum fuso encontrado.</CommandEmpty>
              <CommandGroup>
                {timezones.map((tz) => (
                  <CommandItem
                    key={tz}
                    value={tz}
                    onSelect={(current) => {
                      setValue(current)
                      setOpen(false)
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 size-4",
                        value === tz ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tz}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  )
}
